// Муравьиный алгоритм для оптимизации гиперпараметров нейронной сети

// Глобальные переменные
let isRunning = false;
let shouldStop = false;
let evolutionChart = null;
let bestConfig = null;
let bestAccuracy = 0;
let iterationHistory = [];
let bestNetwork = null;
let testGridSize = 50;
let testMouseDown = false;
let testSprayInterval = null;
let testLastSprayIndex = null;

// Структуры для феромонов
let pheromones = {
  layers: {},      // Количество слоев -> феромон
  neurons: {},     // Количество нейронов -> феромон
  learningRate: {}, // Learning rate -> феромон
  activation: {}    // Функция активации -> феромон
};

// Элементы интерфейса
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');
const currentIterDiv = document.getElementById('currentIter');
const bestAccuracyDiv = document.getElementById('bestAccuracy');
const bestConfigDiv = document.getElementById('bestConfig');
const networkArchDiv = document.getElementById('networkArchitecture');
const topConfigsDiv = document.getElementById('topConfigs');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');

// Параметры слайдеров
const numAntsSlider = document.getElementById('numAnts');
const iterSlider = document.getElementById('iterations');
const alphaSlider = document.getElementById('alpha');
const betaSlider = document.getElementById('beta');
const evapSlider = document.getElementById('evaporation');
const minLayersInput = document.getElementById('minLayers');
const maxLayersInput = document.getElementById('maxLayers');
const minNeuronsInput = document.getElementById('minNeurons');
const maxNeuronsInput = document.getElementById('maxNeurons');
const minLRInput = document.getElementById('minLR');
const maxLRInput = document.getElementById('maxLR');
const actReluCheck = document.getElementById('actRelu');
const actSigmoidCheck = document.getElementById('actSigmoid');
const actTanhCheck = document.getElementById('actTanh');

// Обновление значений слайдеров
numAntsSlider.addEventListener('input', (e) => {
  document.getElementById('antsValue').textContent = e.target.value;
});

iterSlider.addEventListener('input', (e) => {
  document.getElementById('iterValue').textContent = e.target.value;
});

alphaSlider.addEventListener('input', (e) => {
  document.getElementById('alphaValue').textContent = (e.target.value / 100).toFixed(1);
});

betaSlider.addEventListener('input', (e) => {
  document.getElementById('betaValue').textContent = (e.target.value / 100).toFixed(1);
});

evapSlider.addEventListener('input', (e) => {
  document.getElementById('evapValue').textContent = (e.target.value / 100).toFixed(2);
});

minLayersInput.addEventListener('input', updateLayersRange);
maxLayersInput.addEventListener('input', updateLayersRange);
minNeuronsInput.addEventListener('input', updateNeuronsRange);
maxNeuronsInput.addEventListener('input', updateNeuronsRange);
minLRInput.addEventListener('input', updateLRRange);
maxLRInput.addEventListener('input', updateLRRange);

function updateLayersRange() {
  const min = minLayersInput.value;
  const max = maxLayersInput.value;
  document.getElementById('layersValue').textContent = `${min}-${max}`;
}

function updateNeuronsRange() {
  const min = minNeuronsInput.value;
  const max = maxNeuronsInput.value;
  document.getElementById('neuronsValue').textContent = `${min}-${max}`;
}

function updateLRRange() {
  const min = parseFloat(minLRInput.value);
  const max = parseFloat(maxLRInput.value);
  document.getElementById('lrValue').textContent = `${min.toFixed(3)}-${max.toFixed(3)}`;
}

// Инициализация графика
function initChart() {
  const canvas = document.getElementById('evolutionChart');
  if (!canvas) {
    console.error('Canvas элемент не найден!');
    return;
  }
  const ctx = canvas.getContext('2d');
  evolutionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Лучшая точность',
        data: [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }, {
        label: 'Средняя точность',
        data: [],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Точность (%)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Итерация'
          }
        }
      }
    }
  });
}

// Инициализация феромонов
function initializePheromones() {
  const minLayers = parseInt(minLayersInput.value);
  const maxLayers = parseInt(maxLayersInput.value);
  const minNeurons = parseInt(minNeuronsInput.value);
  const maxNeurons = parseInt(maxNeuronsInput.value);
  const minLR = parseFloat(minLRInput.value);
  const maxLR = parseFloat(maxLRInput.value);

  // Инициализируем феромоны для слоев
  pheromones.layers = {};
  for (let i = minLayers; i <= maxLayers; i++) {
    pheromones.layers[i] = 1.0;
  }

  // Инициализируем феромоны для нейронов (дискретные значения)
  pheromones.neurons = {};
  for (let n = minNeurons; n <= maxNeurons; n += 16) {
    const rounded = Math.pow(2, Math.floor(Math.log2(n)));
    pheromones.neurons[rounded] = 1.0;
  }

  // Инициализируем феромоны для learning rate (дискретные значения)
  pheromones.learningRate = {};
  const lrStep = (maxLR - minLR) / 20;
  for (let lr = minLR; lr <= maxLR; lr += lrStep) {
    const rounded = Math.round(lr * 1000) / 1000;
    pheromones.learningRate[rounded] = 1.0;
  }

  // Инициализируем феромоны для активации
  pheromones.activation = {};
  const availableActivations = [];
  if (actReluCheck && actReluCheck.checked) availableActivations.push('relu');
  if (actSigmoidCheck && actSigmoidCheck.checked) availableActivations.push('sigmoid');
  if (actTanhCheck && actTanhCheck.checked) availableActivations.push('tanh');
  
  if (availableActivations.length === 0) {
    availableActivations.push('relu');
  }
  
  availableActivations.forEach(act => {
    pheromones.activation[act] = 1.0;
  });
}

// Выбор значения на основе феромонов и эвристики (вероятностный выбор)
function selectByPheromone(options, pheromoneMap, alpha, beta, heuristicFn = null) {
  if (options.length === 0) return null;
  if (options.length === 1) return options[0];

  // Вычисляем вероятности для каждого варианта
  const probabilities = options.map(option => {
    const pheromone = pheromoneMap[option] || 0.1; // Минимальное значение, если нет феромона
    const heuristic = heuristicFn ? heuristicFn(option) : 1.0;
    // Используем формулу: pheromone^alpha * heuristic^beta
    return Math.pow(Math.max(0.1, pheromone), alpha) * Math.pow(heuristic, beta);
  });

  const total = probabilities.reduce((a, b) => a + b, 0);
  if (total === 0 || !isFinite(total)) {
    return options[Math.floor(Math.random() * options.length)];
  }

  const normalized = probabilities.map(p => p / total);
  
  // Вероятностный выбор
  let rand = Math.random();
  let sum = 0;
  for (let i = 0; i < normalized.length; i++) {
    sum += normalized[i];
    if (rand <= sum) {
      return options[i];
    }
  }
  
  return options[options.length - 1];
}

// Генерация конфигурации муравьем (на основе феромонов)
function generateAntConfig() {
  const minLayers = parseInt(minLayersInput.value);
  const maxLayers = parseInt(maxLayersInput.value);
  const minNeurons = parseInt(minNeuronsInput.value);
  const maxNeurons = parseInt(maxNeuronsInput.value);
  const minLR = parseFloat(minLRInput.value);
  const maxLR = parseFloat(maxLRInput.value);
  
  const alpha = parseFloat(alphaSlider.value) / 100;
  const beta = parseFloat(betaSlider.value) / 100;

  // Выбираем количество слоев
  const layerOptions = [];
  for (let i = minLayers; i <= maxLayers; i++) {
    layerOptions.push(i);
  }
  const numLayers = selectByPheromone(layerOptions, pheromones.layers, alpha, beta);

  // Выбираем нейроны для каждого слоя
  const hiddenLayers = [];
  const neuronOptions = Object.keys(pheromones.neurons).map(Number).filter(n => n >= minNeurons && n <= maxNeurons);
  
  for (let i = 0; i < numLayers; i++) {
    if (neuronOptions.length > 0) {
      const neurons = selectByPheromone(neuronOptions, pheromones.neurons, alpha, beta);
      hiddenLayers.push(neurons);
    } else {
      // Fallback: случайный выбор
      const neurons = Math.floor(Math.random() * (maxNeurons - minNeurons + 1)) + minNeurons;
      hiddenLayers.push(Math.pow(2, Math.floor(Math.log2(neurons))));
    }
  }

  // Выбираем learning rate
  const lrOptions = Object.keys(pheromones.learningRate).map(Number).filter(lr => lr >= minLR && lr <= maxLR);
  let learningRate;
  if (lrOptions.length > 0) {
    learningRate = selectByPheromone(lrOptions, pheromones.learningRate, alpha, beta);
  } else {
    learningRate = minLR + Math.random() * (maxLR - minLR);
  }

  // Выбираем функцию активации
  const activationOptions = Object.keys(pheromones.activation);
  let activation = 'relu';
  if (activationOptions.length > 0) {
    activation = selectByPheromone(activationOptions, pheromones.activation, alpha, beta);
  }

  return {
    hiddenLayers: hiddenLayers,
    learningRate: learningRate,
    activation: activation
  };
}

// Обновление феромонов на основе результатов
function updatePheromones(configs, accuracies) {
  const evaporationRate = parseFloat(evapSlider.value) / 100;

  // Испарение феромонов
  Object.keys(pheromones.layers).forEach(key => {
    pheromones.layers[key] *= (1 - evaporationRate);
    pheromones.layers[key] = Math.max(0.1, pheromones.layers[key]); // Минимальное значение
  });
  Object.keys(pheromones.neurons).forEach(key => {
    pheromones.neurons[key] *= (1 - evaporationRate);
    pheromones.neurons[key] = Math.max(0.1, pheromones.neurons[key]);
  });
  Object.keys(pheromones.learningRate).forEach(key => {
    pheromones.learningRate[key] *= (1 - evaporationRate);
    pheromones.learningRate[key] = Math.max(0.1, pheromones.learningRate[key]);
  });
  Object.keys(pheromones.activation).forEach(key => {
    pheromones.activation[key] *= (1 - evaporationRate);
    pheromones.activation[key] = Math.max(0.1, pheromones.activation[key]);
  });

  // Добавление феромонов на основе точности (увеличиваем количество)
  configs.forEach((config, index) => {
    const accuracy = accuracies[index];
    // Увеличиваем количество феромонов: чем выше точность, тем больше феромонов
    // Используем квадрат точности для усиления эффекта хороших решений
    const pheromoneAmount = (accuracy / 100) * (accuracy / 100) * 10; // Увеличено в 10 раз

    // Обновляем феромоны для слоев
    const numLayers = config.hiddenLayers.length;
    if (!pheromones.layers[numLayers]) {
      pheromones.layers[numLayers] = 0.1;
    }
    pheromones.layers[numLayers] += pheromoneAmount;

    // Обновляем феромоны для нейронов
    config.hiddenLayers.forEach(neurons => {
      const rounded = Math.pow(2, Math.floor(Math.log2(neurons)));
      if (!pheromones.neurons[rounded]) {
        pheromones.neurons[rounded] = 0.1;
      }
      pheromones.neurons[rounded] += pheromoneAmount;
    });

    // Обновляем феромоны для learning rate
    const roundedLR = Math.round(config.learningRate * 1000) / 1000;
    if (!pheromones.learningRate[roundedLR]) {
      pheromones.learningRate[roundedLR] = 0.1;
    }
    pheromones.learningRate[roundedLR] += pheromoneAmount;

    // Обновляем феромоны для активации
    if (!pheromones.activation[config.activation]) {
      pheromones.activation[config.activation] = 0.1;
    }
    pheromones.activation[config.activation] += pheromoneAmount;
  });
}

// Создание и обучение нейронной сети (неблокирующее)
async function trainNetwork(config, trainingData, testData) {
  return new Promise((resolve) => {
    // Проверка на остановку перед началом
    if (shouldStop) {
      console.log('Обучение прервано: shouldStop = true');
      resolve({ accuracy: 0, network: null });
      return;
    }

    const net = new brain.NeuralNetwork({
      hiddenLayers: config.hiddenLayers,
      activation: config.activation || 'relu',
      learningRate: config.learningRate
    });

    // Оптимизировано для производительности
    // Больше итераций для MNIST, меньше для синтетических данных
    const dataSource = document.querySelector('input[name="dataSource"]:checked')?.value || 'synthetic';
    const iterations = dataSource === 'mnist' ? 100 : 50;
    const errorThresh = dataSource === 'mnist' ? 0.005 : 0.01;
    
    const trainingOptions = {
      iterations: iterations,
      errorThresh: errorThresh,
      log: false,
      learningRate: config.learningRate
    };

    // Используем setTimeout для неблокирующего обучения
    setTimeout(() => {
      // Проверка на остановку перед обучением
      if (shouldStop) {
        console.log('Обучение прервано перед net.train: shouldStop = true');
        resolve({ accuracy: 0, network: null });
        return;
      }

      try {
        console.log('Начало обучения сети...', config);
        net.train(trainingData, trainingOptions);
        console.log('Обучение завершено');

        // Проверка на остановку после обучения
        if (shouldStop) {
          console.log('Обучение прервано после net.train: shouldStop = true');
          resolve({ accuracy: 0, network: null });
          return;
        }

        // Тестирование (тоже с задержкой)
        setTimeout(() => {
          if (shouldStop) {
            console.log('Тестирование прервано: shouldStop = true');
            resolve({ accuracy: 0, network: null });
            return;
          }

          let correct = 0;
          // Для MNIST используем больше тестовых данных
          const dataSource = document.querySelector('input[name="dataSource"]:checked')?.value || 'synthetic';
          const testSize = dataSource === 'mnist' 
            ? Math.min(200, testData.length) 
            : Math.min(100, testData.length);
          
          for (let i = 0; i < testSize; i++) {
            if (shouldStop) break; // Прерываем тестирование при остановке
            const output = net.run(testData[i].input);
            const predicted = Object.entries(output).reduce((a, b) => a[1] > b[1] ? a : b)[0];
            const expected = testData[i].output.findIndex(v => v === 1).toString();
            if (predicted === expected) correct++;
          }

          const accuracy = (correct / testSize) * 100;
          console.log('Тестирование завершено, точность:', accuracy);
          resolve({ accuracy, network: net });
        }, 10);
      } catch (error) {
        console.error('Ошибка обучения:', error);
        resolve({ accuracy: 0, network: net });
      }
    }, 50);
  });
}

// Генерация более реалистичных паттернов цифр
function generateDigitPattern(digit, size = 28) {
  const image = new Array(size * size).fill(0);
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.3;
  
  // Добавляем шум
  for (let i = 0; i < image.length; i++) {
    image[i] = Math.random() * 0.1;
  }
  
  // Создаем паттерны для разных цифр
  switch(digit) {
    case 0: // Круг
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist >= radius * 0.7 && dist <= radius) {
            image[y * size + x] = 0.8 + Math.random() * 0.2;
          }
        }
      }
      break;
    case 1: // Вертикальная линия
      for (let y = size * 0.2; y < size * 0.8; y++) {
        for (let x = centerX - 1; x <= centerX + 1; x++) {
          if (x >= 0 && x < size) {
            image[y * size + x] = 0.8 + Math.random() * 0.2;
          }
        }
      }
      break;
    case 2: // S-образная форма
      for (let y = size * 0.2; y < size * 0.5; y++) {
        const x = centerX + (y - centerY) * 0.5;
        if (x >= 0 && x < size) {
          for (let dx = -1; dx <= 1; dx++) {
            if (x + dx >= 0 && x + dx < size) {
              image[y * size + (x + dx)] = 0.8 + Math.random() * 0.2;
            }
          }
        }
      }
      for (let y = size * 0.5; y < size * 0.8; y++) {
        const x = centerX - (y - centerY) * 0.5;
        if (x >= 0 && x < size) {
          for (let dx = -1; dx <= 1; dx++) {
            if (x + dx >= 0 && x + dx < size) {
              image[y * size + (x + dx)] = 0.8 + Math.random() * 0.2;
            }
          }
        }
      }
      break;
    case 3: // Две вертикальные линии
      for (let y = size * 0.2; y < size * 0.8; y++) {
        for (let x of [centerX - radius * 0.5, centerX + radius * 0.5]) {
          const px = Math.round(x);
          if (px >= 0 && px < size) {
            for (let dx = -1; dx <= 1; dx++) {
              if (px + dx >= 0 && px + dx < size) {
                image[y * size + (px + dx)] = 0.8 + Math.random() * 0.2;
              }
            }
          }
        }
      }
      break;
    case 4: // Крест
      for (let y = size * 0.2; y < size * 0.8; y++) {
        const x = centerX;
        if (x >= 0 && x < size) {
          for (let dx = -2; dx <= 2; dx++) {
            if (x + dx >= 0 && x + dx < size) {
              image[y * size + (x + dx)] = 0.8 + Math.random() * 0.2;
            }
          }
        }
      }
      for (let x = size * 0.2; x < size * 0.8; x++) {
        const y = centerY;
        if (y >= 0 && y < size) {
          for (let dy = -2; dy <= 2; dy++) {
            if (y + dy >= 0 && y + dy < size) {
              image[(y + dy) * size + x] = 0.8 + Math.random() * 0.2;
            }
          }
        }
      }
      break;
    case 5: // Прямоугольник
      for (let y = size * 0.3; y < size * 0.7; y++) {
        for (let x = size * 0.3; x < size * 0.7; x++) {
          image[y * size + x] = 0.8 + Math.random() * 0.2;
        }
      }
      break;
    case 6: // Горизонтальная линия
      for (let x = size * 0.2; x < size * 0.8; x++) {
        const y = centerY;
        if (y >= 0 && y < size) {
          for (let dy = -1; dy <= 1; dy++) {
            if (y + dy >= 0 && y + dy < size) {
              image[(y + dy) * size + x] = 0.8 + Math.random() * 0.2;
            }
          }
        }
      }
      break;
    case 7: // Диагональ
      for (let i = 0; i < size * 0.6; i++) {
        const x = size * 0.2 + i * 0.8;
        const y = size * 0.2 + i * 0.8;
        const px = Math.round(x);
        const py = Math.round(y);
        if (px >= 0 && px < size && py >= 0 && py < size) {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (px + dx >= 0 && px + dx < size && py + dy >= 0 && py + dy < size) {
                image[(py + dy) * size + (px + dx)] = 0.8 + Math.random() * 0.2;
              }
            }
          }
        }
      }
      break;
    case 8: // Два круга
      for (let cy of [centerY - radius * 0.5, centerY + radius * 0.5]) {
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const dx = x - centerX;
            const dy = y - cy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist >= radius * 0.4 && dist <= radius * 0.6) {
              image[y * size + x] = 0.8 + Math.random() * 0.2;
            }
          }
        }
      }
      break;
    case 9: // Треугольник
      for (let y = size * 0.3; y < size * 0.7; y++) {
        const width = (y - size * 0.3) * 2;
        const startX = centerX - width / 2;
        const endX = centerX + width / 2;
        for (let x = startX; x <= endX; x++) {
          const px = Math.round(x);
          if (px >= 0 && px < size) {
            image[y * size + px] = 0.8 + Math.random() * 0.2;
          }
        }
      }
      break;
  }
  
  return image;
}

// Генерация тестовых данных с более реалистичными паттернами
function generateTestData(size = 200) {
  const data = [];
  const digitsPerClass = Math.floor(size / 10);
  
  for (let digit = 0; digit < 10; digit++) {
    for (let i = 0; i < digitsPerClass; i++) {
      // Генерируем паттерн с небольшими вариациями
      let pattern = generateDigitPattern(digit);
      
      // Добавляем небольшие случайные вариации
      for (let j = 0; j < pattern.length; j++) {
        pattern[j] = Math.min(1, pattern[j] + (Math.random() - 0.5) * 0.2);
        pattern[j] = Math.max(0, pattern[j]);
      }
      
      const output = new Array(10).fill(0);
      output[digit] = 1;
      data.push({ input: pattern, output });
    }
  }
  
  // Добавляем оставшиеся случайные примеры
  const remaining = size - data.length;
  for (let i = 0; i < remaining; i++) {
    const digit = Math.floor(Math.random() * 10);
    let pattern = generateDigitPattern(digit);
    const output = new Array(10).fill(0);
    output[digit] = 1;
    data.push({ input: pattern, output });
  }
  
  // Перемешиваем данные
  for (let i = data.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [data[i], data[j]] = [data[j], data[i]];
  }
  
  return data;
}

// Основной алгоритм оптимизации
async function runOptimization() {
  if (isRunning) return;
  
  // Сброс состояния при новом запуске
  bestNetwork = null;
  bestAccuracy = 0;
  bestConfig = null;
  iterationHistory = [];
  
  // Скрываем секцию тестирования
  const testSection = document.getElementById('testSection');
  if (testSection) {
    testSection.style.display = 'none';
  }
  
  isRunning = true;
  shouldStop = false;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  progressBar.style.display = 'block';
  updateProgress(0);
  
  const numAnts = parseInt(numAntsSlider.value);
  const maxIterations = parseInt(iterSlider.value);
  
  // Учитываем начальную популяцию (3 сети) + все итерации
  const initialPopSize = Math.min(3, numAnts);
  const totalSteps = initialPopSize + (maxIterations * numAnts);
  let currentStep = 0;

  // Генерация тестовых данных
  statusDiv.textContent = '🔄 Генерация тестовых данных...';
  
  const dataSource = document.querySelector('input[name="dataSource"]:checked')?.value || 'synthetic';
  let trainingData, testData;
  
  if (dataSource === 'mnist' && typeof mnist !== 'undefined') {
    statusDiv.textContent = '🔄 Загрузка данных MNIST...';
    const mnistSet = mnist.set(1000, 200);
    trainingData = mnistSet.training;
    testData = mnistSet.test;
    statusDiv.textContent = '✅ Данные MNIST загружены!';
  } else {
    // Увеличиваем количество данных для лучшего обучения
    trainingData = generateTestData(300);
    testData = generateTestData(150);
  }

  // Инициализация феромонов
  initializePheromones();

  iterationHistory = [];
  bestAccuracy = 0;
  bestConfig = null;
  bestNetwork = null;

  // Начальная случайная популяция для лучшей инициализации (уменьшаем до 3 для ускорения)
  statusDiv.textContent = '🐜 Создание начальной случайной популяции...';
  const initialConfigs = [];
  const initialResults = [];
  
  for (let i = 0; i < initialPopSize && !shouldStop; i++) {
    if (shouldStop) {
      console.log('Прерывание инициализации: shouldStop = true');
      break;
    }
    
    statusDiv.textContent = `🐜 Инициализация: обучение сети ${i + 1}/${initialPopSize}...`;
    currentStep++;
    updateProgress((currentStep / totalSteps) * 100);
    
    // Добавляем небольшую задержку для обновления UI
    await new Promise(resolve => setTimeout(resolve, 200)); // Увеличено для лучшего UI
    
    if (shouldStop) {
      console.log('Прерывание после задержки: shouldStop = true');
      break;
    }
    
    // Генерируем полностью случайную конфигурацию
    const minLayers = parseInt(minLayersInput.value);
    const maxLayers = parseInt(maxLayersInput.value);
    const minNeurons = parseInt(minNeuronsInput.value);
    const maxNeurons = parseInt(maxNeuronsInput.value);
    const minLR = parseFloat(minLRInput.value);
    const maxLR = parseFloat(maxLRInput.value);
    
    const numLayers = Math.floor(Math.random() * (maxLayers - minLayers + 1)) + minLayers;
    const hiddenLayers = [];
    for (let j = 0; j < numLayers; j++) {
      const neurons = Math.floor(Math.random() * (maxNeurons - minNeurons + 1)) + minNeurons;
      hiddenLayers.push(Math.pow(2, Math.floor(Math.log2(neurons))));
    }
    
    const learningRate = minLR + Math.random() * (maxLR - minLR);
    const availableActivations = [];
    if (actReluCheck && actReluCheck.checked) availableActivations.push('relu');
    if (actSigmoidCheck && actSigmoidCheck.checked) availableActivations.push('sigmoid');
    if (actTanhCheck && actTanhCheck.checked) availableActivations.push('tanh');
    const activation = availableActivations.length > 0 
      ? availableActivations[Math.floor(Math.random() * availableActivations.length)]
      : 'relu';
    
    const config = { hiddenLayers, learningRate, activation };
    
    if (shouldStop) {
      console.log('Прерывание перед обучением: shouldStop = true');
      break;
    }
    
    console.log(`Обучение сети ${i + 1}/${initialPopSize}...`);
    const result = await trainNetwork(config, trainingData, testData);
    
    if (shouldStop) {
      console.log('Прерывание после обучения: shouldStop = true');
      break;
    }
    
    initialConfigs.push(config);
    initialResults.push({
      config: config,
      accuracy: result.accuracy,
      network: result.network
    });

    // Обновляем лучшую конфигурацию (но после сортировки все равно синхронизируем с топ-1)
    if (result.accuracy >= bestAccuracy) {
      bestAccuracy = result.accuracy;
      bestConfig = config;
      bestNetwork = result.network;
      updateBestConfigDisplay();
    }
  }
  
  // Элитизм: сохраняем лучшие конфигурации между итерациями
  let eliteConfigs = [];

  // Обновляем феромоны на основе начальной популяции
  if (initialConfigs.length > 0) {
    const initialAccuracies = initialResults.map(r => r.accuracy);
    updatePheromones(initialConfigs, initialAccuracies);
    
    // Сохраняем лучшие конфигурации как элитные
    initialResults.sort((a, b) => b.accuracy - a.accuracy);
    eliteConfigs = initialResults.slice(0, 2);
    
    // Синхронизируем лучшую конфигурацию с топ-1 после сортировки
    if (initialResults.length > 0 && initialResults[0].accuracy >= bestAccuracy) {
      bestAccuracy = initialResults[0].accuracy;
      bestConfig = initialResults[0].config;
      if (initialResults[0].network) {
        bestNetwork = initialResults[0].network;
      }
      updateBestConfigDisplay();
    }
    
    // Обновляем топ-5 конфигураций
    updateTopConfigs(initialResults.slice(0, 5));
  }

  // Основной цикл итераций
  for (let iter = 0; iter < maxIterations && !shouldStop; iter++) {
    currentIterDiv.textContent = `Итерация: ${iter + 1}/${maxIterations}`;
    statusDiv.textContent = `🐜 Итерация ${iter + 1}: создание конфигураций муравьями...`;

    const configs = [];
    const results = [];

    // В первой итерации добавляем элитные конфигурации (если есть)
    if (iter === 0 && eliteConfigs.length > 0) {
      for (let i = 0; i < Math.min(1, eliteConfigs.length); i++) {
        const elite = eliteConfigs[i];
        statusDiv.textContent = `🐜 Итерация ${iter + 1}: переобучение элитной конфигурации ${i + 1}...`;
        currentStep++;
        updateProgress((currentStep / totalSteps) * 100);
        
        // Добавляем небольшую задержку для обновления UI
        await new Promise(resolve => setTimeout(resolve, 200)); // Увеличено для лучшего UI
        
        const result = await trainNetwork(elite.config, trainingData, testData);
        configs.push(elite.config);
        results.push({
          config: elite.config,
          accuracy: result.accuracy,
          network: result.network
        });

        if (result.accuracy > bestAccuracy) {
          bestAccuracy = result.accuracy;
          bestConfig = elite.config;
          bestNetwork = result.network;
          updateBestConfigDisplay();
        }
      }
    }

    // Каждый муравей создает конфигурацию и обучает сеть
    // В первой итерации, если есть элитные конфигурации, создаем меньше муравьев
    const eliteCount = (iter === 0 && eliteConfigs.length > 0) ? Math.min(1, eliteConfigs.length) : 0;
    const antsToCreate = numAnts - eliteCount;
    
    for (let ant = 0; ant < antsToCreate && !shouldStop; ant++) {
      if (shouldStop) {
        console.log('Прерывание цикла муравьев: shouldStop = true');
        break;
      }
      
      statusDiv.textContent = `🐜 Итерация ${iter + 1}: обучение сети муравья ${ant + 1}/${numAnts}...`;
      currentStep++;
      updateProgress((currentStep / totalSteps) * 100);
      
      // Добавляем задержку для обновления UI
      await new Promise(resolve => setTimeout(resolve, 200)); // Увеличено для лучшего UI
      
      if (shouldStop) {
        console.log('Прерывание после задержки в цикле муравьев: shouldStop = true');
        break;
      }
      
      const config = generateAntConfig();
      console.log(`Обучение сети муравья ${ant + 1}/${numAnts} (antsToCreate: ${antsToCreate})...`);
      const result = await trainNetwork(config, trainingData, testData);
      
      if (shouldStop) {
        console.log('Прерывание после обучения муравья: shouldStop = true');
        break;
      }
      
      configs.push(config);
      results.push({
        config: config,
        accuracy: result.accuracy,
        network: result.network
      });

      // Обновляем лучшую конфигурацию
      if (result.accuracy > bestAccuracy) {
        bestAccuracy = result.accuracy;
        bestConfig = config;
        bestNetwork = result.network;
        updateBestConfigDisplay();
      }
    }

    // Обновляем феромоны на основе результатов
    const accuracies = results.map(r => r.accuracy);
    updatePheromones(configs, accuracies);

    // Обновляем элитные конфигурации (топ-2 для ускорения)
    results.sort((a, b) => b.accuracy - a.accuracy);
    eliteConfigs = results.slice(0, 2);

    // Вычисление средней точности
    const avgAccuracy = accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length;

    // Обновление графика
    iterationHistory.push({
      iteration: iter + 1,
      best: bestAccuracy,
      average: avgAccuracy
    });
    updateChart();

    // Обновление топ-5 конфигураций
    results.sort((a, b) => b.accuracy - a.accuracy);
    
    // Синхронизируем лучшую конфигурацию с топ-1 после сортировки
    if (results.length > 0 && results[0].accuracy >= bestAccuracy) {
      bestAccuracy = results[0].accuracy;
      bestConfig = results[0].config;
      if (results[0].network) {
        bestNetwork = results[0].network;
      }
      updateBestConfigDisplay();
    }
    
    updateTopConfigs(results.slice(0, 5));
  }

  isRunning = false;
  startBtn.disabled = false;
  stopBtn.disabled = false;
  updateProgress(100);
  
  // Финальная синхронизация - находим лучшую конфигурацию из всех итераций
  // (но это уже сделано в цикле, просто убеждаемся что все обновлено)
  updateBestConfigDisplay();
  
  if (shouldStop) {
    statusDiv.textContent = '⏸ Оптимизация остановлена пользователем';
  } else {
    statusDiv.textContent = '✅ Оптимизация завершена! Лучшая конфигурация найдена.';
    // Показываем секцию тестирования
    if (bestNetwork && document.getElementById('testSection') && bestConfig) {
      const testSection = document.getElementById('testSection');
      testSection.style.display = 'block';
      
      // Обновляем информацию о конфигурации в подзаголовке
      const testConfigLayers = document.getElementById('testConfigLayers');
      const testConfigLR = document.getElementById('testConfigLR');
      const testConfigActivation = document.getElementById('testConfigActivation');
      if (testConfigLayers) testConfigLayers.textContent = `[${bestConfig.hiddenLayers.join(', ')}]`;
      if (testConfigLR) testConfigLR.textContent = bestConfig.learningRate.toFixed(4);
      if (testConfigActivation) testConfigActivation.textContent = bestConfig.activation || 'relu';
      
      initTestDrawing();
      const retrainBtn = document.getElementById('retrainBtn');
      if (retrainBtn) retrainBtn.disabled = false;
    }
    
    const saveModelBtn = document.getElementById('saveModelBtn');
    if (saveModelBtn) saveModelBtn.disabled = false;
  }
  
  setTimeout(() => {
    progressBar.style.display = 'none';
  }, 2000);
}

function updateProgress(percent) {
  if (progressFill) {
    progressFill.style.width = percent + '%';
    progressFill.textContent = Math.round(percent) + '%';
  }
}

function updateBestConfigDisplay() {
  if (!bestConfig || bestAccuracy === 0) {
    bestAccuracyDiv.textContent = 'Лучшая точность: -';
    bestConfigDiv.textContent = 'Лучшая конфигурация: -';
    if (networkArchDiv) networkArchDiv.textContent = '-';
    return;
  }

  bestAccuracyDiv.textContent = `Лучшая точность: ${bestAccuracy.toFixed(2)}%`;
  
  const archText = `Слои: [${bestConfig.hiddenLayers.join(', ')}]\n` +
                   `Learning Rate: ${bestConfig.learningRate.toFixed(4)}\n` +
                   `Активация: ${bestConfig.activation || 'relu'}`;
  if (networkArchDiv) networkArchDiv.textContent = archText;

  const configText = `Слои: [${bestConfig.hiddenLayers.join(', ')}], ` +
                    `LR: ${bestConfig.learningRate.toFixed(4)}, ` +
                    `Активация: ${bestConfig.activation || 'relu'}`;
  bestConfigDiv.textContent = `Лучшая конфигурация: ${configText}`;
}

function updateChart() {
  if (!evolutionChart) return;

  const labels = iterationHistory.map(h => h.iteration);
  const bestData = iterationHistory.map(h => h.best);
  const avgData = iterationHistory.map(h => h.average);

  evolutionChart.data.labels = labels;
  evolutionChart.data.datasets[0].data = bestData;
  evolutionChart.data.datasets[1].data = avgData;
  evolutionChart.update();
}

function updateTopConfigs(results) {
  let html = '';
  results.forEach((result, index) => {
    const isBest = index === 0;
    html += `<div class="config-item ${isBest ? 'best' : ''}">`;
    html += `<strong>#${index + 1}</strong> Точность: ${result.accuracy.toFixed(2)}%<br>`;
    html += `Слои: [${result.config.hiddenLayers.join(', ')}], `;
    html += `LR: ${result.config.learningRate.toFixed(4)}, `;
    html += `Активация: ${result.config.activation || 'relu'}`;
    html += `</div>`;
  });
  topConfigsDiv.innerHTML = html;
}

// Обработчики событий
startBtn.addEventListener('click', () => {
  runOptimization();
});

stopBtn.addEventListener('click', () => {
  console.log('Кнопка остановки нажата!');
  shouldStop = true;
  stopBtn.disabled = true;
  if (statusDiv) statusDiv.textContent = '⏸ Остановка оптимизации...';
  console.log('shouldStop установлен в true');
});

resetBtn.addEventListener('click', () => {
  if (isRunning) return;
  
  iterationHistory = [];
  bestAccuracy = 0;
  bestConfig = null;
  bestNetwork = null;
  initializePheromones();
  
  // Скрываем секцию тестирования
  const testSection = document.getElementById('testSection');
  if (testSection) {
    testSection.style.display = 'none';
  }
  
  // Сбрасываем кнопки
  const saveModelBtn = document.getElementById('saveModelBtn');
  if (saveModelBtn) saveModelBtn.disabled = true;
  const retrainBtn = document.getElementById('retrainBtn');
  if (retrainBtn) retrainBtn.disabled = true;
  
  if (evolutionChart) {
    evolutionChart.data.labels = [];
    evolutionChart.data.datasets[0].data = [];
    evolutionChart.data.datasets[1].data = [];
    evolutionChart.update();
  }
  
  statusDiv.textContent = 'Готов к запуску';
  currentIterDiv.textContent = 'Итерация: -';
  bestAccuracyDiv.textContent = 'Лучшая точность: -';
  bestConfigDiv.textContent = 'Лучшая конфигурация: -';
  networkArchDiv.textContent = '-';
  topConfigsDiv.innerHTML = '-';
});

// Функции для тестирования сети (из оригинального кода)
function initTestDrawing() {
  const drawGrid = document.getElementById('drawGrid');
  if (!drawGrid) return;
  
  drawGrid.innerHTML = '';
  
  for (let i = 0; i < testGridSize * testGridSize; i++) {
    const pixel = document.createElement('div');
    pixel.classList.add('draw-pixel');
    
    pixel.addEventListener('mousedown', (e) => {
      e.preventDefault();
      testMouseDown = true;
      const tool = document.getElementById('testTool').value;
      const size = parseInt(document.getElementById('testBrushSize').value);
      if (tool === 'spray') {
        startTestSpray(i, size);
      } else {
        testDrawAt(i, size, tool);
      }
    });
    
    pixel.addEventListener('mouseover', () => {
      if (!testMouseDown) return;
      const tool = document.getElementById('testTool').value;
      const size = parseInt(document.getElementById('testBrushSize').value);
      if (tool === 'spray') {
        testLastSprayIndex = i;
      } else {
        testDrawAt(i, size, tool);
      }
    });
    
    drawGrid.appendChild(pixel);
  }
  
  const preview = document.getElementById('testPreview28');
  if (preview) {
    preview.innerHTML = '';
    for (let i = 0; i < 28 * 28; i++) {
      const pixel = document.createElement('div');
      pixel.classList.add('preview-pixel');
      preview.appendChild(pixel);
    }
  }
}

function testDrawAt(index, size, tool) {
  const row = Math.floor(index / testGridSize);
  const col = index % testGridSize;
  const grid = document.getElementById('drawGrid');
  
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
      const newIndex = r * testGridSize + c;
      if (r >= 0 && r < testGridSize && c >= 0 && c < testGridSize) {
        const pixel = grid.children[newIndex];
        if (pixel) pixel.classList.add('active');
      }
    });
  } else if (tool === 'spray') {
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
      const index = r * testGridSize + c;
      
      if (r >= 0 && r < testGridSize && c >= 0 && c < testGridSize) {
        const pixel = grid.children[index];
        if (pixel) pixel.classList.add('active');
      }
    }
  } else if (tool === 'eraser') {
    const eraserSize = 2 * size + 2;
    const radius = Math.floor(eraserSize / 2);
    for (let dy = -radius; dy < radius; dy++) {
      for (let dx = -radius; dx < radius; dx++) {
        const r = row + dy;
        const c = col + dx;
        const newIndex = r * testGridSize + c;
        if (r >= 0 && r < testGridSize && c >= 0 && c < testGridSize) {
          const pixel = grid.children[newIndex];
          if (pixel) pixel.classList.remove('active');
        }
      }
    }
  }
}

function startTestSpray(index, size) {
  stopTestSpray();
  testLastSprayIndex = index;
  testSprayInterval = setInterval(() => {
    testDrawAt(testLastSprayIndex, size, 'spray');
  }, 25);
}

function stopTestSpray() {
  clearInterval(testSprayInterval);
  testSprayInterval = null;
  testLastSprayIndex = null;
}

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

document.addEventListener('DOMContentLoaded', () => {
  const testPredictBtn = document.getElementById('testPredictBtn');
  const testClearBtn = document.getElementById('testClearBtn');
  const testBrushSize = document.getElementById('testBrushSize');
  const testBrushValue = document.getElementById('testBrushValue');
  
  if (testPredictBtn) {
    testPredictBtn.addEventListener('click', () => {
      if (!bestNetwork) {
        document.getElementById('testResult').textContent = 'Сначала запустите оптимизацию!';
        return;
      }
      
      const grid = document.getElementById('drawGrid');
      const pixels = Array.from(grid.children).map(p => p.classList.contains('active') ? 1 : 0);
      const compressed = resizeInputAvg(pixels, testGridSize, testGridSize, 28, 28);
      const resizedInput = centerAndNormalize(compressed, 28, 28);
      const normalized = resizedInput.map(v => Math.min(1, v * 2.5));
      
      const preview = document.getElementById('testPreview28');
      preview.innerHTML = '';
      normalized.forEach(val => {
        const pixel = document.createElement('div');
        pixel.classList.add('preview-pixel');
        const level = Math.floor((1 - val) * 255);
        pixel.style.backgroundColor = `rgb(${level}, ${level}, ${level})`;
        preview.appendChild(pixel);
      });
      
      const output = bestNetwork.run(normalized);
      const predicted = Object.entries(output).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
      
      // Нормализуем значения уверенности (сумма всех вероятностей = 100%)
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
      
      const confidence = normalizedOutput[predicted] * 100;
      
      document.getElementById('testResult').textContent = `Результат: ${predicted} (уверенность: ${confidence.toFixed(1)}%)`;
      
      const confidenceDiv = document.getElementById('testConfidence');
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
    });
  }
  
  if (testClearBtn) {
    testClearBtn.addEventListener('click', () => {
      const grid = document.getElementById('drawGrid');
      Array.from(grid.children).forEach(p => p.classList.remove('active'));
      document.getElementById('testResult').textContent = 'Результат: -';
      const preview = document.getElementById('testPreview28');
      preview.innerHTML = '';
      for (let i = 0; i < 28 * 28; i++) {
        const pixel = document.createElement('div');
        pixel.classList.add('preview-pixel');
        preview.appendChild(pixel);
      }
      document.getElementById('testConfidence').innerHTML = '';
    });
  }
  
  if (testBrushSize && testBrushValue) {
    testBrushSize.addEventListener('input', () => {
      testBrushValue.textContent = testBrushSize.value;
    });
  }
  
  document.addEventListener('mouseup', () => {
    testMouseDown = false;
    stopTestSpray();
  });
  
  const saveModelBtn = document.getElementById('saveModelBtn');
  if (saveModelBtn) {
    saveModelBtn.addEventListener('click', () => {
      if (!bestNetwork) {
        alert('Сначала запустите оптимизацию!');
        return;
      }
      
      const modelJSON = bestNetwork.toJSON();
      const blob = new Blob([JSON.stringify(modelJSON, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `optimized_model_ant_${bestAccuracy.toFixed(1)}_accuracy.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`Модель сохранена! Точность: ${bestAccuracy.toFixed(2)}%\nФайл: optimized_model_ant_${bestAccuracy.toFixed(1)}_accuracy.json`);
    });
  }
  
  const retrainBtn = document.getElementById('retrainBtn');
  if (retrainBtn) {
    retrainBtn.addEventListener('click', async () => {
      if (!bestNetwork) {
        alert('Сначала запустите оптимизацию!');
        return;
      }
      
      const grid = document.getElementById('drawGrid');
      const pixels = Array.from(grid.children).map(p => p.classList.contains('active') ? 1 : 0);
      if (pixels.every(p => p === 0)) {
        alert('Нарисуйте цифру для дообучения!');
        return;
      }
      
      const compressed = resizeInputAvg(pixels, testGridSize, testGridSize, 28, 28);
      const resizedInput = centerAndNormalize(compressed, 28, 28);
      const normalized = resizedInput.map(v => Math.min(1, v * 2.5));
      
      const correctDigit = prompt('Какую цифру вы нарисовали? (0-9):');
      if (correctDigit === null || isNaN(correctDigit) || correctDigit < 0 || correctDigit > 9) {
        return;
      }
      
      const output = new Array(10).fill(0);
      output[parseInt(correctDigit)] = 1;
      
      retrainBtn.disabled = true;
      retrainBtn.textContent = '🔄 Дообучение...';
      
      const trainingData = [{ input: normalized, output }];
      
      await new Promise(resolve => {
        bestNetwork.train(trainingData, {
          iterations: 50,
          learningRate: bestConfig.learningRate,
          log: false
        });
        setTimeout(resolve, 100);
      });
      
      retrainBtn.disabled = false;
      retrainBtn.textContent = '🔄 Дообучить';
      
      alert('Модель дообучена! Попробуйте распознать цифру снова.');
      
      const testPredictBtn = document.getElementById('testPredictBtn');
      if (testPredictBtn) testPredictBtn.click();
    });
  }
});

// Функция для переключения меню (должна быть глобальной для onclick)
window.toggleMenu = function() {
  const menuContent = document.getElementById('menuContent');
  const menuToggle = document.getElementById('menuToggle');
  if (menuContent) {
    const isActive = menuContent.classList.toggle('active');
    if (menuToggle) {
      if (isActive) {
        menuToggle.style.bottom = '80px';
      } else {
        menuToggle.style.bottom = '15px';
      }
    }
  }
};

document.addEventListener('click', (e) => {
  const bottomBar = document.getElementById('bottomBar');
  const menuToggle = document.getElementById('menuToggle');
  const menuContent = document.getElementById('menuContent');
  
  if (bottomBar && menuContent && menuContent.classList.contains('active')) {
    if (!bottomBar.contains(e.target) && e.target !== menuToggle) {
      menuContent.classList.remove('active');
      if (menuToggle) {
        menuToggle.style.bottom = '15px';
      }
    }
  }
});

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', () => {
  // Проверка наличия Chart.js
  if (typeof Chart === 'undefined') {
    console.error('Chart.js не загружен!');
    document.getElementById('evolutionChart').parentElement.innerHTML = 
      '<p style="color: red;">Ошибка: Chart.js не загружен. Проверьте подключение библиотеки.</p>';
  } else {
    initChart();
  }
  
  updateLayersRange();
  updateNeuronsRange();
  updateLRRange();
  initializePheromones();
});

