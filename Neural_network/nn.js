let net;

//модель из model.json
fetch('model.json')
  .then(res => res.json())
  .then(data => {
    net = new brain.NeuralNetwork();
    net.fromJSON(data);
    console.log('Модель загружена');
  });


const grid = document.getElementById('grid');
const resultDiv = document.getElementById('result');
const toolSelect = document.getElementById('tool');
const brushSizeInput = document.getElementById('brushSize');
const brushValue = document.getElementById('brushValue');


const gridSize = 50;
let mouseDown = false;
let sprayInterval = null;
let lastSprayIndex = null;


// курсор ластика
const eraserCursor = document.createElement('div');
eraserCursor.id = 'eraserCursor';
document.body.appendChild(eraserCursor);

document.addEventListener('mousemove', (e) => {
  const tool = toolSelect.value;
  if (tool === 'eraser') {
    const size = parseInt(brushSizeInput.value);
    const eraserSize = (2 * size + 2) * 11;
    const gridRect = grid.getBoundingClientRect();

    const x = e.pageX;
    const y = e.pageY;

    if (x >= gridRect.left && x <= gridRect.right && y >= gridRect.top && y <= gridRect.bottom) {
      eraserCursor.style.display = 'block';
      eraserCursor.style.width = `${eraserSize}px`;
      eraserCursor.style.height = `${eraserSize}px`;
      eraserCursor.style.left = `${x - eraserSize / 2}px`;
      eraserCursor.style.top = `${y - eraserSize / 2}px`;
    } else {
      eraserCursor.style.display = 'none';
    }
  } else {
    eraserCursor.style.display = 'none';
  }
});


// для рисовашки, с белого на черный перекл
function activatePixel(index) {
  const pixel = grid.children[index];
  if (pixel) pixel.classList.add('active');
}

function deactivatePixel(index) {
  const pixel = grid.children[index];
  if (pixel) pixel.classList.remove('active');
}


// рисовашка: ручка, спрей, стиралка
function drawAt(index, size, tool) {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;

  if (tool === 'pen') {
    const directions = {
      1: [[0, 1], [1, 1], [0, 0], [1, 0]],
      2: [[0, 1], [-1, 0], [0, 0], [1, 0], [0, -1]],
      3: [[-1, 1], [0, 1], [1, 1], [-1, 0], [0, 0], [1, 0], [-1, -1], [0, -1], [1, -1]],
      4: [[-1, 1], [0, 1], [1, 1], [2, 1], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, -1], [0, -1], [1, -1], [2, -1], [-1, -2], [0, -2], [1, -2], [2, -2]]
    };

    directions[size].forEach(([dy, dx]) => {
      const r = row + dy;
      const c = col + dx;
      const newIndex = r * gridSize + c;
      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
        activatePixel(newIndex);
      }
    });
  }

  else if (tool === 'spray') {
    const radiusMap = { 1: 1, 2: 2, 3: 4, 4: 6 };
    const radius = radiusMap[size];
    const attempts = Math.floor(radius * 9);

    for (let i = 0; i < attempts; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const dist = Math.sqrt(Math.random()) * radius;
      const dx = Math.round(Math.cos(angle) * dist);
      const dy = Math.round(Math.sin(angle) * dist);

      const r = row + dy;
      const c = col + dx;
      const index = r * gridSize + c;

      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
        activatePixel(index);
      }
    }
  }

  else if (tool === 'eraser') {
    const eraserSize = 2 * size + 2;
    const radius = Math.floor(eraserSize / 2);
    for (let dy = -radius; dy < radius; dy++) {
      for (let dx = -radius; dx < radius; dx++) {
        const r = row + dy;
        const c = col + dx;
        const newIndex = r * gridSize + c;
        if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
          deactivatePixel(newIndex);
        }
      }
    }
  }
}

function startSpray(index, size) {
  stopSpray();
  lastSprayIndex = index;
  sprayInterval = setInterval(() => {
    drawAt(lastSprayIndex, size, 'spray');
  }, 25);
}

function stopSpray() {
  clearInterval(sprayInterval);
  sprayInterval = null;
  lastSprayIndex = null;
}


// создание сетки
for (let i = 0; i < gridSize * gridSize; i++) {
  const pixel = document.createElement('div');
  pixel.classList.add('pixel');

  pixel.addEventListener('mousedown', (e) => {
    e.preventDefault();
    mouseDown = true;
    const tool = toolSelect.value;
    const size = parseInt(brushSizeInput.value);
    if (tool === 'spray') {
      startSpray(i, size);
    } else {
      drawAt(i, size, tool, false);
    }
  });

  pixel.addEventListener('mouseover', () => {
    if (!mouseDown) return;
    const tool = toolSelect.value;
    const size = parseInt(brushSizeInput.value);
    if (tool === 'spray') {
      lastSprayIndex = i;
    } else {
      drawAt(i, size, tool, true);
    }
  });

  grid.appendChild(pixel);
}

brushSizeInput.addEventListener('input', () => {
  brushValue.textContent = brushSizeInput.value;
});

document.addEventListener('mouseup', () => {
  mouseDown = false;
  stopSpray();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  document.querySelectorAll('.pixel').forEach(p => p.classList.remove('active'));
  resultDiv.textContent = 'Результат: ...';
  const preview = document.getElementById('preview28');
  preview.innerHTML = '';
  for (let i = 0; i < 28 * 28; i++) {
    const pixel = document.createElement('div');
    pixel.classList.add('preview-pixel');
    preview.appendChild(pixel);
  }
  const confidenceDiv = document.getElementById('confidence');
  if (confidenceDiv) {
    confidenceDiv.innerHTML = '';
  }
  lastNormalizedInput = null;
});


// централизирует, обрезает и расширяет ищображение
function centerAndNormalize(input, width, height, targetSize = 28) {
  let top = height, bottom = 0, left = width, right = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (input[i] > 0) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (top > bottom || left > right) {
    return new Array(targetSize * targetSize).fill(0);
  }
  const boxWidth = right - left + 1;
  const boxHeight = bottom - top + 1;
  const maxBoxSide = Math.max(boxWidth, boxHeight);
  const scale = 20 / maxBoxSide;
  const newWidth = Math.max(1, Math.round(boxWidth * scale));
  const newHeight = Math.max(1, Math.round(boxHeight * scale));
  const cropped = [];
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      cropped.push(input[y * width + x]);
    }
  }
  const resized = resizeInputAvg(cropped, boxWidth, boxHeight, newWidth, newHeight);
  const output = new Array(targetSize * targetSize).fill(0);
  const xOffset = Math.floor((targetSize - newWidth) / 2);
  const yOffset = Math.floor((targetSize - newHeight) / 2);
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const val = resized[y * newWidth + x];
      const targetX = x + xOffset;
      const targetY = y + yOffset;
      output[targetY * targetSize + targetX] = val;
    }
  }
  return output;
}

// Функция уменьшает изображение до 28*28, усредняя значения пикселей, вроде помогает нн, серые тона
function resizeInputAvg(input, width, height, newWidth, newHeight) {
  const resized = [];
  const xRatio = width / newWidth;
  const yRatio = height / newHeight;
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      let sum = 0;
      let count = 0;
      const startX = Math.floor(x * xRatio);
      const endX = Math.ceil((x + 1) * xRatio);
      const startY = Math.floor(y * yRatio);
      const endY = Math.ceil((y + 1) * yRatio);
      for (let j = startY; j < endY; j++) {
        for (let i = startX; i < endX; i++) {
          const index = j * width + i;
          sum += input[index];
          count++;
        }
      }
      resized.push(sum / count);
    }
  }
  return resized;
}


// Глобальная переменная для хранения последнего нормализованного входа
let lastNormalizedInput = null;

// обработка и предсказание числа
document.getElementById('predictBtn').addEventListener('click', () => {
  const pixels = Array.from(document.querySelectorAll('.pixel')).map(p => p.classList.contains('active') ? 1 : 0);
  if (!net) {
    resultDiv.textContent = 'Модель не загружена';
    return;
  }
  const compressed = resizeInputAvg(pixels, 50, 50, 28, 28);
  const resizedInput = centerAndNormalize(compressed, 28, 28);
  const normalized = resizedInput.map(v => Math.min(1, v * 2.5));
  lastNormalizedInput = normalized; // Сохраняем для дообучения
  
  const preview = document.getElementById('preview28');
  preview.innerHTML = '';
  normalized.forEach(val => {
    const pixel = document.createElement('div');
    pixel.classList.add('preview-pixel');
    const level = Math.floor((1 - val) * 255);
    pixel.style.backgroundColor = `rgb(${level}, ${level}, ${level})`;
    preview.appendChild(pixel);
  });
  const output = net.run(normalized);
  console.log('Prediction output:', output);
  const predicted = Object.entries(output).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  resultDiv.textContent = `Результат: ${predicted}`;
  
  // Отображение вероятностей всех цифр
  const confidenceDiv = document.getElementById('confidence');
  if (confidenceDiv) {
    // Нормализуем вероятности (сумма = 100%)
    // Убеждаемся, что все значения неотрицательные
    const positiveOutput = {};
    Object.entries(output).forEach(([digit, value]) => {
      positiveOutput[digit] = Math.max(0, value); // Гарантируем неотрицательность
    });
    const sum = Object.values(positiveOutput).reduce((a, b) => a + b, 0);
    const normalizedOutput = {};
    Object.entries(positiveOutput).forEach(([digit, value]) => {
      normalizedOutput[digit] = sum > 0 ? Math.max(0, value / sum) : 0; // Нормализуем от 0 до 1
    });
    
    let confidenceHTML = '<strong>Вероятности по всем цифрам:</strong>';
    Object.entries(normalizedOutput)
      .sort((a, b) => b[1] - a[1])
      .forEach(([digit, conf]) => {
        const percent = (conf * 100).toFixed(1);
        const isPredicted = digit === predicted;
        confidenceHTML += `
          <div class="confidence-item" style="${isPredicted ? 'font-weight: 600; color: #667eea;' : ''}">
            <span>${digit}:</span>
            <div class="confidence-bar">
              <div class="confidence-bar-fill" style="width: ${percent}%"></div>
            </div>
            <span style="min-width: 45px; text-align: right;">${percent}%</span>
          </div>
        `;
      });
    confidenceDiv.innerHTML = confidenceHTML;
  }
});

// Обработчик дообучения
const retrainBtn = document.getElementById('retrainBtn');
if (retrainBtn) {
  retrainBtn.addEventListener('click', async () => {
    if (!net) {
      alert('Модель не загружена!');
      return;
    }
    
    if (!lastNormalizedInput) {
      alert('Сначала нарисуйте и распознайте цифру!');
      return;
    }
    
    const pixels = Array.from(document.querySelectorAll('.pixel')).map(p => p.classList.contains('active') ? 1 : 0);
    if (pixels.every(p => p === 0)) {
      alert('Нарисуйте цифру для дообучения!');
      return;
    }
    
    // Спрашиваем правильный ответ
    const correctDigit = prompt('Какую цифру вы нарисовали? (0-9):');
    if (correctDigit === null || isNaN(correctDigit) || correctDigit < 0 || correctDigit > 9) {
      return;
    }
    
    const output = new Array(10).fill(0);
    output[parseInt(correctDigit)] = 1;
    
    // Дообучаем сеть на этом примере
    retrainBtn.disabled = true;
    retrainBtn.textContent = '🔄 Дообучение...';
    
    const trainingData = [{ input: lastNormalizedInput, output }];
    
    await new Promise(resolve => {
      setTimeout(() => {
        net.train(trainingData, {
          iterations: 50,
          learningRate: 0.01,
          log: false
        });
        setTimeout(resolve, 100);
      }, 10);
    });
    
    retrainBtn.disabled = false;
    retrainBtn.textContent = '🔄 Дообучить';
    
    alert('Модель дообучена! Попробуйте распознать цифру снова.');
    
    // Автоматически распознаем снова
    document.getElementById('predictBtn').click();
  });
}


// Превью перед загрузкой
window.addEventListener('DOMContentLoaded', () => {
  const preview = document.getElementById('preview28');
  for (let i = 0; i < 28 * 28; i++) {
    const pixel = document.createElement('div');
    pixel.classList.add('preview-pixel');
    preview.appendChild(pixel);
  }
});

// Функция для переключения меню
function toggleMenu() {
  const menuContent = document.getElementById('menuContent');
  const menuToggle = document.getElementById('menuToggle');
  if (menuContent) {
    const isActive = menuContent.classList.toggle('active');
    // Поднимаем/опускаем кнопку вместе с меню
    if (menuToggle) {
      if (isActive) {
        menuToggle.style.bottom = '80px';
      } else {
        menuToggle.style.bottom = '15px';
      }
    }
  }
}

// Закрытие меню при клике вне его
document.addEventListener('click', (e) => {
  const bottomBar = document.getElementById('bottomBar');
  const menuToggle = document.getElementById('menuToggle');
  const menuContent = document.getElementById('menuContent');
  
  if (bottomBar && menuContent && menuContent.classList.contains('active')) {
    if (!bottomBar.contains(e.target) && e.target !== menuToggle) {
      menuContent.classList.remove('active');
      // Опускаем кнопку обратно
      if (menuToggle) {
        menuToggle.style.bottom = '15px';
      }
    }
  }
});
