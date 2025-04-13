const canvasMap = document.getElementById("canvas");
const canvasMapContext = canvasMap.getContext("2d");

const canvasPlot = document.getElementById("plotCanvas");
const canvasPlotContext = canvasPlot.getContext("2d");

const startButton = document.getElementById("startButton");
const clearButton = document.getElementById("clearButton");
const multiRunButton = document.getElementById("multiRunBtn");

const statusLabel = document.getElementById("statusLabel");
const coordinatesLabel = document.getElementById("coordinates");

const toggleDistancesBtn = document.getElementById("toggleDistancesBtn");


let pointList = [];
let isRunning = false;
let hasRunAtLeastOnce = false;
let showDistances = true;
let lastBestPath = null;


function getClickedPointIndex(x, y, points, radius = 7) {
  for (let i = 0; i < points.length; i++) {
    const dx = x - points[i].x;
    const dy = y - points[i].y;
    if (dx * dx + dy * dy <= radius * radius) {
      return i;
    }
  }
  return -1;
}
// сообщение перед загрузкой
window.addEventListener("load", () => {
  drawIntroMessage();
});
function drawIntroMessage() {
  const ctx = canvasPlotContext;
  ctx.clearRect(0, 0, canvasPlot.width, canvasPlot.height);
  ctx.fillStyle = "#666";
  ctx.font = "16px Arial";
  ctx.fillText("Здесь будет отображаться график", 20, 20);
}
// Появление точек на канвасе
canvasMap.addEventListener("click", (event) => {
  if (isRunning) return;
  const canvasRect = canvasMap.getBoundingClientRect();
  const xCoord = event.clientX - canvasRect.left;
  const yCoord = event.clientY - canvasRect.top;

  const clickedIndex = getClickedPointIndex(xCoord, yCoord, pointList);
  
  if (clickedIndex !== -1) {
    pointList.splice(clickedIndex, 1);
  } else {
    pointList.push({ x: xCoord, y: yCoord });
  }

  renderPoints();
});


// Отрисовка точек и линий
function renderPoints(pathSequence = null) {
  canvasMapContext.clearRect(0, 0, canvasMap.width, canvasMap.height);

  if (pathSequence) {
    canvasMapContext.beginPath();
    canvasMapContext.moveTo(pointList[pathSequence[0]].x, pointList[pathSequence[0]].y);

    // Линии
    for (let i = 1; i < pathSequence.length; i++) {
      const endPoint = pointList[pathSequence[i]];
      canvasMapContext.lineTo(endPoint.x, endPoint.y);
    }

    const lastPoint = pointList[pathSequence[pathSequence.length - 1]];
    const firstPoint = pointList[pathSequence[0]];
    canvasMapContext.lineTo(firstPoint.x, firstPoint.y);

    canvasMapContext.strokeStyle = "red";
    canvasMapContext.lineWidth = 2;
    canvasMapContext.stroke();

    // Длина линии
    if (showDistances) {
      for (let i = 1; i < pathSequence.length; i++) {
        const startPoint = pointList[pathSequence[i - 1]];
        const endPoint = pointList[pathSequence[i]];
        const distance = calculateDistance(startPoint, endPoint);
    
        const midX = (startPoint.x + endPoint.x) / 2;
        const midY = (startPoint.y + endPoint.y) / 2;
    
        canvasMapContext.fillStyle = "white";
        canvasMapContext.fillRect(midX - 5, midY - 10, 45, 14);
    
        canvasMapContext.fillStyle = "black";
        canvasMapContext.fillText(distance.toFixed(2), midX, midY);
      }
    
      const distance = calculateDistance(lastPoint, firstPoint);
      const midX = (lastPoint.x + firstPoint.x) / 2;
      const midY = (lastPoint.y + firstPoint.y) / 2;
    
      canvasMapContext.fillStyle = "white";
      canvasMapContext.fillRect(midX - 5, midY - 10, 45, 14);
    
      canvasMapContext.fillStyle = "black";
      canvasMapContext.fillText(distance.toFixed(2), midX, midY);
    }
    
  }

  pointList.forEach((point, index) => {
    canvasMapContext.beginPath();
    canvasMapContext.arc(point.x, point.y, 5, 0, 2 * Math.PI);
    canvasMapContext.fillStyle = "black";
    canvasMapContext.fill();
    canvasMapContext.fillText(index + 1, point.x + 5, point.y - 5);
  });
}

// Функция для вычисления расстояния между двумя точками
function calculateDistance(pointA, pointB) {
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

// Чистка канваса
clearButton.addEventListener("click", () => {
  if (isRunning) return;
  pointList = [];
  canvasMapContext.clearRect(0, 0, canvasMap.width, canvasMap.height);
  canvasPlotContext.clearRect(0, 0, canvasPlot.width, canvasPlot.height);
});

// Запуск ГА
startButton.addEventListener("click", () => {
  if (isRunning) return;
  if (pointList.length < 3) {
    alert("Нужно хотя бы 3 точки.");
    return;
  }
  toggleUIBlocking(true);
  runGeneticAlgorithm().then((result) => {
    renderComparisonPlot([result]);
    statusLabel.textContent = `Путь завершён, длина: ${result.distance.toFixed(2)}`;
    toggleUIBlocking(false);
  });
});

// Повторенный запуск ГА с несколькими итерациями
multiRunButton.addEventListener("click", async () => {
  if (isRunning) return;
  if (pointList.length < 3) {
    alert("Нужно хотя бы 3 точки.");
    return;
  }

  isRunning = true;
  toggleUIBlocking(true);
  statusLabel.textContent = "Запуск нескольких итераций...";

  const runCount = 5;
  const resultList = [];

  for (let runIndex = 0; runIndex < runCount; runIndex++) {
    const runResult = await runGeneticAlgorithmOnce(true);
    resultList.push(runResult);
    statusLabel.textContent = `Запуск ${runIndex + 1}/${runCount}, путь: ${runResult.distance.toFixed(2)}`;
  }

  const bestResult = resultList.reduce((best, current) =>
    current.distance < best.distance ? current : best
  );

  renderPoints(bestResult.path)
  lastBestPath = bestResult.path;
  statusLabel.textContent = `Лучший путь: ${bestResult.distance.toFixed(2)}`;
  renderComparisonPlot(resultList);
  isRunning = false;
  toggleUIBlocking(false);
});

// Блокировка интерфейса во время работы ГА
function toggleUIBlocking(state) {
  startButton.disabled = state;
  multiRunButton.disabled = state;
  clearButton.disabled = state;
  isRunning = state;
  toggleDistancesBtn.disabled = state;
}

function runGeneticAlgorithm() {
  return runGeneticAlgorithmOnce(true);
}

// сам генетический алгоритм
function runGeneticAlgorithmOnce(returnResult = false) {
  
  return new Promise((resolve) => {
    const POPULATION_SIZE = 100;
    const MAX_GENERATIONS = 100;
    const CROSSOVER_PROBABILITY = 0.9;
    const MUTATION_PROBABILITY = 0.1;

    function calculateDistance(pointA, pointB) {
      return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
    }

    function calculateTotalDistance(path) {
      let total = 0;
      for (let i = 0; i < path.length - 1; i++) {
        total += calculateDistance(pointList[path[i]], pointList[path[i + 1]]);
      }
      total += calculateDistance(pointList[path[path.length - 1]], pointList[path[0]]);
      return total;
    }

    function createRandomPath() {
      return shuffleArray([...Array(pointList.length).keys()]);
    }

    function shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    function performCrossover(parent1, parent2) {
      const size = parent1.length;
      const start = Math.floor(Math.random() * size);
      const end = start + Math.floor(Math.random() * (size - start));
      const child = Array(size).fill(null);
      for (let i = start; i < end; i++) child[i] = parent1[i];
      let index = 0;
      for (let i = 0; i < size; i++) {
        if (!child.includes(parent2[i])) {
          while (child[index] !== null) index++;
          child[index] = parent2[i];
        }
      }
      return child;
    }

    function performMutation(individual) {
      const i = Math.floor(Math.random() * individual.length);
      const j = Math.floor(Math.random() * individual.length);
      [individual[i], individual[j]] = [individual[j], individual[i]];
    }

    let population = Array.from({ length: POPULATION_SIZE }, createRandomPath);
    let bestPath = population[0];
    let bestDistance = calculateTotalDistance(bestPath);
    let generationNumber = 0;

    const gaInterval = setInterval(() => {
      const rankedPopulation = population
        .map((individual) => ({ individual, distance: calculateTotalDistance(individual) }))
        .sort((a, b) => a.distance - b.distance);

      if (rankedPopulation[0].distance < bestDistance) {
        bestPath = rankedPopulation[0].individual;
        bestDistance = rankedPopulation[0].distance;
        if (!returnResult) renderPoints(bestPath);
      }

      const nextGeneration = [];
      while (nextGeneration.length < POPULATION_SIZE) {
        const parent1 = rankedPopulation[Math.floor(Math.random() * 10)].individual;
        const parent2 = rankedPopulation[Math.floor(Math.random() * 10)].individual;
        let offspring = Math.random() < CROSSOVER_PROBABILITY
          ? performCrossover(parent1, parent2)
          : [...parent1];
        if (Math.random() < MUTATION_PROBABILITY) performMutation(offspring);
        nextGeneration.push(offspring);
      }

      population = nextGeneration;
      generationNumber++;

      if (generationNumber >= MAX_GENERATIONS) {
        clearInterval(gaInterval);
        renderPoints(bestPath);

        if (returnResult) {
          lastBestPath = bestPath;
          resolve({
            path: bestPath,
            distance: bestDistance,
            generation: generationNumber,
            index: runGeneticAlgorithmOnce.runIndex++
          });
        } else {
          statusLabel.textContent = `Путь завершён, длина: ${bestDistance.toFixed(2)}`;
          resolve();
        }
      }
    }, 20);
  });
}
runGeneticAlgorithmOnce.runIndex = 0;

// Отображение графика сравнения результатов нескольких запусков ГА
function renderComparisonPlot(resultArray) {
  hasRunAtLeastOnce = true;

  const ctx = canvasPlotContext;
  ctx.clearRect(0, 0, canvasPlot.width, canvasPlot.height);

  const distances = resultArray.map(r => r.distance);
  const max = Math.max(...distances);
  const min = Math.min(...distances);

  let range = max - min;
  if (range < max * 0.01) range = max * 0.01;

  const minIndex = distances.findIndex(d => d === min);

  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.fillText(
    resultArray.length === 1 ? "Результат одиночного запуска" : "Результаты запусков",
    10,
    30
  );

  const barWidth = 40;
  const gap = 20;
  const totalBarsWidth = resultArray.length * (barWidth + gap) - gap;
  const startX = (canvasPlot.width - totalBarsWidth) / 2;

  resultArray.forEach((result, index) => {
    const xPosition = startX + index * (barWidth + gap);
  
    let barHeight;
    if (resultArray.length === 1) {
      barHeight = canvasPlot.height * 0.5;
    } else {
      const normalizedHeight = ((result.distance - min) / range) * (canvasPlot.height - 80);
      barHeight = Math.max(50, normalizedHeight);
    }
  
    const yPosition = canvasPlot.height - barHeight - 20;
  
    ctx.fillStyle = index === minIndex ? "green" : "blue";
    ctx.fillRect(xPosition, yPosition, barWidth, barHeight);
  
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    ctx.fillText(result.distance.toFixed(2), xPosition, yPosition - 5);
    ctx.fillText(index + 1, xPosition + barWidth / 2 - 4, canvasPlot.height - 5);
  });
  
}

// координыт отображение
canvasMap.addEventListener("mousemove", (event) => {
  const rect = canvasMap.getBoundingClientRect();
  const x = Math.floor(event.clientX - rect.left);
  const y = Math.floor(event.clientY - rect.top);
  coordinatesLabel.style.display = "block";
  coordinatesLabel.textContent = `X: ${x}, Y: ${y}`;
});

canvasMap.addEventListener("mouseleave", () => {
  coordinatesLabel.style.display = "none";
});

toggleDistancesBtn.addEventListener("click", () => {
  showDistances = !showDistances;
  toggleDistancesBtn.textContent = showDistances ? "Скрыть длины" : "Показать длины";

  if (hasRunAtLeastOnce && lastBestPath) {
    renderPoints(lastBestPath);
  } else {
    renderPoints();
  }
});
