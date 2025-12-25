// Генетический алгоритм для оптимизации гиперпараметров нейронной сети

// Глобальные переменные
let isRunning = false;
let shouldStop = false;
let evolutionChart = null;
let bestConfig = null;
let bestAccuracy = 0;
let generationHistory = [];
let bestNetwork = null; // Сохраненная лучшая сеть для тестирования
let testGridSize = 50;
let testMouseDown = false;
let testSprayInterval = null;
let testLastSprayIndex = null;

// Элементы интерфейса
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');
const currentGenDiv = document.getElementById('currentGen');
const bestAccuracyDiv = document.getElementById('bestAccuracy');
const bestConfigDiv = document.getElementById('bestConfig');
const networkArchDiv = document.getElementById('networkArchitecture');
const topConfigsDiv = document.getElementById('topConfigs');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');

// Параметры слайдеров
const popSizeSlider = document.getElementById('popSize');
const genSlider = document.getElementById('generations');
const mutSlider = document.getElementById('mutation');
const crossSlider = document.getElementById('crossover');
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
popSizeSlider.addEventListener('input', (e) => {
  document.getElementById('popSizeValue').textContent = e.target.value;
});

genSlider.addEventListener('input', (e) => {
  document.getElementById('genValue').textContent = e.target.value;
});

mutSlider.addEventListener('input', (e) => {
  document.getElementById('mutValue').textContent = (e.target.value / 100).toFixed(2);
});

crossSlider.addEventListener('input', (e) => {
  document.getElementById('crossValue').textContent = (e.target.value / 100).toFixed(2);
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
            text: 'Поколение'
          }
        }
      }
    }
  });
}

// Генерация случайной конфигурации нейронной сети
function generateRandomConfig() {
  const minLayers = parseInt(minLayersInput.value);
  const maxLayers = parseInt(maxLayersInput.value);
  const minNeurons = parseInt(minNeuronsInput.value);
  const maxNeurons = parseInt(maxNeuronsInput.value);
  const minLR = parseFloat(minLRInput.value);
  const maxLR = parseFloat(maxLRInput.value);

  const numLayers = Math.floor(Math.random() * (maxLayers - minLayers + 1)) + minLayers;
  const hiddenLayers = [];
  
  for (let i = 0; i < numLayers; i++) {
    const neurons = Math.floor(Math.random() * (maxNeurons - minNeurons + 1)) + minNeurons;
    // Округляем до степени 2 для удобства
    hiddenLayers.push(Math.pow(2, Math.floor(Math.log2(neurons))));
  }

  const learningRate = minLR + Math.random() * (maxLR - minLR);
  
  // Выбираем случайную функцию активации из выбранных
  const availableActivations = [];
  if (actReluCheck && actReluCheck.checked) availableActivations.push('relu');
  if (actSigmoidCheck && actSigmoidCheck.checked) availableActivations.push('sigmoid');
  if (actTanhCheck && actTanhCheck.checked) availableActivations.push('tanh');
  
  // Если ничего не выбрано, используем relu по умолчанию
  // Также проверяем, что элементы существуют (для безопасности)
  let activation = 'relu';
  if (availableActivations.length > 0) {
    activation = availableActivations[Math.floor(Math.random() * availableActivations.length)];
  } else if (actReluCheck || actSigmoidCheck || actTanhCheck) {
    // Если элементы есть, но ничего не выбрано - используем relu
    activation = 'relu';
  }
  
  return {
    hiddenLayers: hiddenLayers,
    learningRate: learningRate,
    activation: activation
  };
}

// Кодирование конфигурации в хромосому (для генетического алгоритма)
function encodeConfig(config) {
  return {
    layers: config.hiddenLayers,
    learningRate: config.learningRate,
    activation: config.activation
  };
}

// Декодирование хромосомы в конфигурацию
function decodeConfig(chromosome) {
  return {
    hiddenLayers: chromosome.layers,
    learningRate: chromosome.learningRate,
    activation: chromosome.activation || 'relu' // Используем из хромосомы или relu по умолчанию
  };
}

// Создание и обучение нейронной сети (неблокирующее)
async function trainNetwork(config, trainingData, testData) {
  return new Promise((resolve) => {
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
      try {
        net.train(trainingData, trainingOptions);

        // Тестирование (тоже с задержкой)
        setTimeout(() => {
          let correct = 0;
          // Для MNIST используем больше тестовых данных
          const dataSource = document.querySelector('input[name="dataSource"]:checked')?.value || 'synthetic';
          const testSize = dataSource === 'mnist' 
            ? Math.min(200, testData.length) 
            : Math.min(100, testData.length);
          
          for (let i = 0; i < testSize; i++) {
            const output = net.run(testData[i].input);
            const predicted = Object.entries(output).reduce((a, b) => a[1] > b[1] ? a : b)[0];
            const expected = testData[i].output.findIndex(v => v === 1).toString();
            if (predicted === expected) correct++;
          }

          const accuracy = (correct / testSize) * 100;
          resolve({ accuracy, network: net });
        }, 10);
      } catch (error) {
        console.error('Ошибка обучения:', error);
        resolve({ accuracy: 0, network: net });
      }
    }, 10);
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

// Кроссовер двух конфигураций
function crossover(parent1, parent2) {
  const layers1 = [...parent1.layers];
  const layers2 = [...parent2.layers];
  
  // Одноточечный кроссовер
  const minLen = Math.min(layers1.length, layers2.length);
  if (minLen > 1) {
    const point = Math.floor(Math.random() * (minLen - 1)) + 1;
    const childLayers = [...layers1.slice(0, point), ...layers2.slice(point)];
    
    // Смешиваем learning rate
    const avgLR = (parent1.learningRate + parent2.learningRate) / 2;
    
    // Выбираем активацию от одного из родителей (случайно)
    const activation = Math.random() < 0.5 
      ? (parent1.activation || 'relu') 
      : (parent2.activation || 'relu');
    
    return {
      layers: childLayers,
      learningRate: avgLR,
      activation: activation
    };
  }
  
  return {
    layers: layers1,
    learningRate: parent1.learningRate,
    activation: parent1.activation || 'relu'
  };
}

// Мутация конфигурации
function mutate(chromosome) {
  const minLayers = parseInt(minLayersInput.value);
  const maxLayers = parseInt(maxLayersInput.value);
  const minNeurons = parseInt(minNeuronsInput.value);
  const maxNeurons = parseInt(maxNeuronsInput.value);
  const minLR = parseFloat(minLRInput.value);
  const maxLR = parseFloat(maxLRInput.value);

  const mutated = { ...chromosome };

  // Мутация количества слоев
  if (Math.random() < 0.3) {
    const newNumLayers = Math.max(minLayers, Math.min(maxLayers, 
      mutated.layers.length + (Math.random() < 0.5 ? -1 : 1)));
    
    if (newNumLayers !== mutated.layers.length) {
      if (newNumLayers > mutated.layers.length) {
        const neurons = Math.floor(Math.random() * (maxNeurons - minNeurons + 1)) + minNeurons;
        mutated.layers.push(Math.pow(2, Math.floor(Math.log2(neurons))));
      } else {
        mutated.layers.pop();
      }
    }
  }

  // Мутация количества нейронов в случайном слое
  if (mutated.layers.length > 0 && Math.random() < 0.5) {
    const layerIndex = Math.floor(Math.random() * mutated.layers.length);
    const neurons = Math.floor(Math.random() * (maxNeurons - minNeurons + 1)) + minNeurons;
    mutated.layers[layerIndex] = Math.pow(2, Math.floor(Math.log2(neurons)));
  }

  // Мутация learning rate
  if (Math.random() < 0.4) {
    const mutationAmount = (maxLR - minLR) * 0.1;
    mutated.learningRate = Math.max(minLR, Math.min(maxLR, 
      mutated.learningRate + (Math.random() - 0.5) * mutationAmount));
  }

  // Мутация функции активации
  if (Math.random() < 0.2) { // 20% вероятность мутации активации
    const availableActivations = [];
    if (actReluCheck && actReluCheck.checked) availableActivations.push('relu');
    if (actSigmoidCheck && actSigmoidCheck.checked) availableActivations.push('sigmoid');
    if (actTanhCheck && actTanhCheck.checked) availableActivations.push('tanh');
    
    if (availableActivations.length > 1) {
      // Выбираем случайную активацию, отличную от текущей
      const otherActivations = availableActivations.filter(a => a !== mutated.activation);
      if (otherActivations.length > 0) {
        mutated.activation = otherActivations[Math.floor(Math.random() * otherActivations.length)];
      }
    } else if (availableActivations.length === 1) {
      mutated.activation = availableActivations[0];
    }
  }

  return mutated;
}

// Основной алгоритм оптимизации
async function runOptimization() {
  if (isRunning) return;
  
  isRunning = true;
  shouldStop = false;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  progressBar.style.display = 'block';
  updateProgress(0);
  
  const popSize = parseInt(popSizeSlider.value);
  const maxGenerations = parseInt(genSlider.value);
  const mutationProb = parseFloat(mutSlider.value) / 100;
  const crossoverProb = parseFloat(crossSlider.value) / 100;
  
  // Общее количество шагов для прогресс-бара
  const totalSteps = popSize + (maxGenerations * (popSize - Math.floor(popSize * 0.1)));
  let currentStep = 0;

  // Генерация тестовых данных (оптимизировано для скорости)
  // Генерация тестовых данных
  statusDiv.textContent = '🔄 Генерация тестовых данных...';
  
  // Проверяем источник данных
  const dataSource = document.querySelector('input[name="dataSource"]:checked')?.value || 'synthetic';
  let trainingData, testData;
  
  if (dataSource === 'mnist' && typeof mnist !== 'undefined') {
    // Используем реальные данные MNIST
    statusDiv.textContent = '🔄 Загрузка данных MNIST...';
    const mnistSet = mnist.set(1000, 200); // 1000 для обучения, 200 для теста (можно увеличить)
    trainingData = mnistSet.training;
    testData = mnistSet.test;
    statusDiv.textContent = '✅ Данные MNIST загружены!';
  } else {
    // Используем синтетические данные
    trainingData = generateTestData(200);
    testData = generateTestData(100);
  }

  // Инициализация популяции
  statusDiv.textContent = '🧬 Создание начальной популяции...';
  let population = [];
  for (let i = 0; i < popSize; i++) {
    const config = generateRandomConfig();
    population.push({
      chromosome: encodeConfig(config),
      config: config,
      fitness: 0
    });
  }

      // Оценка начальной популяции (с задержками для UI)
  statusDiv.textContent = '🎓 Обучение начальной популяции нейронных сетей...';
  for (let i = 0; i < population.length; i++) {
    if (shouldStop) break;
    statusDiv.textContent = `🎓 Обучение сети ${i + 1}/${popSize}...`;
    currentStep++;
    updateProgress((currentStep / totalSteps) * 100);
    
      // Добавляем небольшую задержку для обновления UI
    await new Promise(resolve => setTimeout(resolve, 200)); // Увеличено для лучшего UI
    
    const result = await trainNetwork(population[i].config, trainingData, testData);
    population[i].fitness = result.accuracy;
    population[i].network = result.network; // Сохраняем сеть
    
    // Обновляем лучшую сеть
    if (result.accuracy > bestAccuracy) {
      bestAccuracy = result.accuracy;
      bestConfig = population[i].config;
      bestNetwork = result.network;
      updateBestConfigDisplay();
    }
  }

  // Сортируем начальную популяцию перед первым поколением
  population.sort((a, b) => b.fitness - a.fitness);
  
  // Устанавливаем лучшую конфигурацию из начальной популяции
  if (population[0].fitness > bestAccuracy) {
    bestAccuracy = population[0].fitness;
    bestConfig = population[0].config;
    if (population[0].network) {
      bestNetwork = population[0].network;
    }
    updateBestConfigDisplay();
  }
  
  updateTopConfigs(population);

  generationHistory = [];

  // Эволюция
  for (let gen = 0; gen < maxGenerations && !shouldStop; gen++) {
    currentGenDiv.textContent = `Поколение: ${gen + 1}/${maxGenerations}`;
    statusDiv.textContent = `🧬 Поколение ${gen + 1}: оценка и селекция лучших сетей...`;

    // Сортировка по фитнесу
    population.sort((a, b) => b.fitness - a.fitness);

    // Обновление лучшей конфигурации
    if (population[0].fitness > bestAccuracy) {
      bestAccuracy = population[0].fitness;
      bestConfig = population[0].config;
      
      // Сохраняем лучшую сеть для тестирования
      if (population[0].network) {
        bestNetwork = population[0].network;
      }
      
      updateBestConfigDisplay();
    }

    // Вычисление средней точности
    const avgFitness = population.reduce((sum, p) => sum + p.fitness, 0) / population.length;

    // Обновление графика
    generationHistory.push({
      generation: gen + 1,
      best: bestAccuracy,
      average: avgFitness
    });
    updateChart();

    // Создание нового поколения
    const newPopulation = [];
    
    // Элитизм: сохраняем лучших
    const eliteSize = Math.floor(popSize * 0.1);
    for (let i = 0; i < eliteSize; i++) {
      newPopulation.push({ ...population[i] });
    }

    // Генерация потомков
    const childrenNeeded = popSize - newPopulation.length;
    let childIndex = 0;
    while (newPopulation.length < popSize) {
      if (shouldStop) break;

      // Селекция (турнирная)
      const parent1 = population[Math.floor(Math.random() * Math.min(10, popSize))];
      const parent2 = population[Math.floor(Math.random() * Math.min(10, popSize))];

      let childChromosome;
      if (Math.random() < crossoverProb) {
        childChromosome = crossover(parent1.chromosome, parent2.chromosome);
      } else {
        childChromosome = { ...parent1.chromosome };
      }

      // Мутация
      if (Math.random() < mutationProb) {
        childChromosome = mutate(childChromosome);
      }

      const childConfig = decodeConfig(childChromosome);
      const child = {
        chromosome: childChromosome,
        config: childConfig,
        fitness: 0
      };

      // Оценка потомка
      childIndex++;
      statusDiv.textContent = `🧬 Поколение ${gen + 1}: создание и обучение потомка ${childIndex}/${childrenNeeded}...`;
      currentStep++;
      updateProgress((currentStep / totalSteps) * 100);
      
      // Добавляем задержку для обновления UI
      await new Promise(resolve => setTimeout(resolve, 200)); // Увеличено для лучшего UI
      
      const result = await trainNetwork(childConfig, trainingData, testData);
      child.fitness = result.accuracy;
      child.network = result.network; // Сохраняем сеть

      newPopulation.push(child);
      
      // Обновляем лучшую сеть, если это лучший потомок
      if (child.fitness > bestAccuracy) {
        bestAccuracy = child.fitness;
        bestConfig = child.config;
        bestNetwork = result.network;
        updateBestConfigDisplay();
      }
    }

    population = newPopulation;
    // Сортируем перед отображением
    population.sort((a, b) => b.fitness - a.fitness);
    
    // Обновляем лучшую конфигурацию после сортировки
    if (population[0].fitness > bestAccuracy) {
      bestAccuracy = population[0].fitness;
      bestConfig = population[0].config;
      if (population[0].network) {
        bestNetwork = population[0].network;
      }
      updateBestConfigDisplay();
    }
    
    updateTopConfigs(population);
  }

  isRunning = false;
  startBtn.disabled = false;
  stopBtn.disabled = false;
  updateProgress(100);
  
  // Финальная сортировка и обновление
  if (population.length > 0) {
    population.sort((a, b) => b.fitness - a.fitness);
    
    // Обновляем лучшую конфигурацию из финальной популяции
    if (population[0].fitness > bestAccuracy) {
      bestAccuracy = population[0].fitness;
      bestConfig = population[0].config;
      if (population[0].network) {
        bestNetwork = population[0].network;
      }
    }
    
    updateBestConfigDisplay();
    updateTopConfigs(population);
  }
  
  if (shouldStop) {
    statusDiv.textContent = '⏸ Оптимизация остановлена пользователем';
  } else {
    statusDiv.textContent = '✅ Оптимизация завершена! Лучшая конфигурация найдена.';
    // Показываем секцию тестирования
    if (bestNetwork && document.getElementById('testSection')) {
      document.getElementById('testSection').style.display = 'block';
      initTestDrawing();
      const retrainBtn = document.getElementById('retrainBtn');
      if (retrainBtn) retrainBtn.disabled = false;
    }
    
    // Активируем кнопку сохранения
    const saveModelBtn = document.getElementById('saveModelBtn');
    if (saveModelBtn) saveModelBtn.disabled = false;
  }
  
  setTimeout(() => {
    progressBar.style.display = 'none';
  }, 2000);
}

// Обновление прогресс-бара
function updateProgress(percent) {
  if (progressFill) {
    progressFill.style.width = percent + '%';
    progressFill.textContent = Math.round(percent) + '%';
  }
}

// Обновление отображения лучшей конфигурации
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

// Обновление графика
function updateChart() {
  if (!evolutionChart) return;

  const labels = generationHistory.map(h => h.generation);
  const bestData = generationHistory.map(h => h.best);
  const avgData = generationHistory.map(h => h.average);

  evolutionChart.data.labels = labels;
  evolutionChart.data.datasets[0].data = bestData;
  evolutionChart.data.datasets[1].data = avgData;
  evolutionChart.update();
}

// Обновление топ-5 конфигураций
function updateTopConfigs(population) {
  const top5 = population.slice(0, 5);
  let html = '';
  top5.forEach((ind, index) => {
    const isBest = index === 0;
    html += `<div class="config-item ${isBest ? 'best' : ''}">`;
    html += `<strong>#${index + 1}</strong> Точность: ${ind.fitness.toFixed(2)}%<br>`;
    html += `Слои: [${ind.config.hiddenLayers.join(', ')}], `;
    html += `LR: ${ind.config.learningRate.toFixed(4)}, `;
    html += `Активация: ${ind.config.activation || 'relu'}`;
    html += `</div>`;
  });
  topConfigsDiv.innerHTML = html;
}

// Обработчики событий
startBtn.addEventListener('click', () => {
  runOptimization();
});

stopBtn.addEventListener('click', () => {
  shouldStop = true;
  stopBtn.disabled = true;
  statusDiv.textContent = '⏸ Остановка оптимизации...';
});

resetBtn.addEventListener('click', () => {
  if (isRunning) return;
  
  generationHistory = [];
  bestAccuracy = 0;
  bestConfig = null;
  
  if (evolutionChart) {
    evolutionChart.data.labels = [];
    evolutionChart.data.datasets[0].data = [];
    evolutionChart.data.datasets[1].data = [];
    evolutionChart.update();
  }
  
  statusDiv.textContent = 'Готов к запуску';
  currentGenDiv.textContent = 'Поколение: -';
  bestAccuracyDiv.textContent = 'Лучшая точность: -';
  bestConfigDiv.textContent = 'Лучшая конфигурация: -';
  networkArchDiv.textContent = '-';
  topConfigsDiv.innerHTML = '-';
});

// Функции для тестирования сети
function initTestDrawing() {
  const drawGrid = document.getElementById('drawGrid');
  if (!drawGrid) return;
  
  drawGrid.innerHTML = '';
  
  // Создаем сетку для рисования
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
  
  // Инициализация превью
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

// Функции обработки изображения (из nn.js)
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

// Обработчик кнопки распознавания
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
      
      // Показываем превью
      const preview = document.getElementById('testPreview28');
      preview.innerHTML = '';
      normalized.forEach(val => {
        const pixel = document.createElement('div');
        pixel.classList.add('preview-pixel');
        const level = Math.floor((1 - val) * 255);
        pixel.style.backgroundColor = `rgb(${level}, ${level}, ${level})`;
        preview.appendChild(pixel);
      });
      
      // Распознавание
      const output = bestNetwork.run(normalized);
      const predicted = Object.entries(output).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
      
      // Нормализуем значения уверенности (сумма всех вероятностей = 100%)
      const sum = Object.values(output).reduce((a, b) => a + b, 0);
      const normalizedOutput = {};
      Object.entries(output).forEach(([digit, value]) => {
        normalizedOutput[digit] = sum > 0 ? value / sum : 0; // Нормализуем от 0 до 1
      });
      
      const confidence = normalizedOutput[predicted] * 100; // Для отображения в процентах
      
      document.getElementById('testResult').textContent = `Результат: ${predicted} (уверенность: ${confidence.toFixed(1)}%)`;
      
      // Показываем уверенность для всех цифр (нормализованную)
      const confidenceDiv = document.getElementById('testConfidence');
      let confidenceHTML = '<strong>Вероятности по всем цифрам:</strong>';
      Object.entries(normalizedOutput)
        .sort((a, b) => b[1] - a[1])
        .forEach(([digit, conf]) => {
          const percent = (conf * 100).toFixed(1); // Преобразуем в проценты
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
  
  // Обработчик сохранения модели
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
      a.download = `optimized_model_${bestAccuracy.toFixed(1)}_accuracy.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert(`Модель сохранена! Точность: ${bestAccuracy.toFixed(2)}%\nФайл: optimized_model_${bestAccuracy.toFixed(1)}_accuracy.json`);
    });
  }
  
  // Обработчик дообучения
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
      
      // Автоматически распознаем снова
      const testPredictBtn = document.getElementById('testPredictBtn');
      if (testPredictBtn) testPredictBtn.click();
    });
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
});

