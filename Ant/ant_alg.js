const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const startButton = document.getElementById("startButton");
const clearButton = document.getElementById("clearButton");
const resetPheromonesButton = document.getElementById("resetPheromonesButton");
const animatePathButton = document.getElementById("animatePathButton");
const autoRunCheckbox = document.getElementById("autoRun");
const pathLengthDisplay = document.getElementById("pathLengthDisplay");

let points = [];
let isRunning = false;

const alpha = 1;
const beta = 2;
const evaporationRate = 0.5;
const numAnts = 10;
const maxIterations = 100;

let pheromones = [];
let distances = [];
let bestPathGlobal = null;
let allPathsOfAllIterations = []; 

// 1 клик- 1 точка
canvas.addEventListener("click", (event) => {
  if (isRunning) return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  points.push({ x, y });
  renderPoints();

  if (autoRunCheckbox.checked) runAntAlgorithm();
});

//запуск по кнопке
startButton.addEventListener("click", () => {
  if (isRunning) return;
  if (points.length < 3) {
    alert("Нужно хотя бы 3 точки для решения задачи коммивояжера.");
    return;
  }
  isRunning = true;
  runAntAlgorithm();
});

//очистка 
clearButton.addEventListener("click", () => {
  if (isRunning) return;
  points = [];
  pheromones = [];
  distances = [];
  bestPathGlobal = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  pathLengthDisplay.textContent = '';
});

resetPheromonesButton.addEventListener("click", () => {
  if (isRunning) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  resetPheromones();
  renderPoints();
  pathLengthDisplay.textContent = '';
});

animatePathButton.addEventListener("click", () => {
  if (!bestPathGlobal || bestPathGlobal.length === 0) {
    alert("Сначала нужно запустить алгоритм и найти путь.");
    return;
  }
  animateBestPath(bestPathGlobal);
});

function runAntAlgorithm() {
  initialize();
  let bestPath = null;
  let bestLength = Infinity;

  // Сохраняем пути на каждой итерации
  allPathsOfAllIterations = [];

  for (let i = 0; i < maxIterations; i++) {
    const { bestInIteration, length, paths, lengths } = runAntsOnce();
    if (length < bestLength) {
      bestLength = length;
      bestPath = bestInIteration;
    }

    allPathsOfAllIterations.push(paths);

    updatePheromones(paths, lengths);
  }

  bestPathGlobal = bestPath;

  renderBestPath(bestPath);
  pathLengthDisplay.textContent = `Длина найденного пути: ${bestLength.toFixed(2)}`;
  isRunning = false;
}

function runAntsOnce() {
  const paths = [], lengths = [];
  let bestInIteration = null, bestLength = Infinity;

  for (let i = 0; i < numAnts; i++) {
    const path = generateAntPath();
    const length = calculatePathLength(path);
    paths.push(path);
    lengths.push(length);

    if (length < bestLength) {
      bestLength = length;
      bestInIteration = path;
    }
  }

  return { bestInIteration, length: bestLength, paths, lengths };
}

//генерация путь для 1 муравья 
function generateAntPath() {
  const path = [];
  const visited = Array(points.length).fill(false);
  let current = Math.floor(Math.random() * points.length);

  path.push(current);
  visited[current] = true;

  for (let i = 1; i < points.length; i++) {
    current = selectNextPoint(current, visited);
    path.push(current);
    visited[current] = true;
  }

  return path;
}

//выбор точки(феромоны,расстояния)
function selectNextPoint(current, visited) {
  const probabilities = points.map((_, i) => {
    if (visited[i]) return 0;
    const pher = pheromones[current][i];
    const dist = distances[current][i];
    return Math.pow(pher, alpha) * Math.pow(1 / dist, beta);
  });

  const total = probabilities.reduce((a, b) => a + b, 0);
  if (total === 0) return visited.findIndex(v => !v);

  const normalized = probabilities.map(p => p / total);

  let rand = Math.random(), sum = 0; //рандомно выбираем
  for (let i = 0; i < normalized.length; i++) {
    sum += normalized[i];
    if (rand <= sum) return i;
  }

  return 0;
}

function initialize() {
  resetPheromones();
  distances = calculateDistances();
}

function resetPheromones() {
  pheromones = createMatrix(points.length, 1);
}

function calculateDistances() {
  const dists = createMatrix(points.length, 0);
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const dist = Math.hypot(dx, dy);
      dists[i][j] = dists[j][i] = dist;
    }
  }
  return dists;
}

function createMatrix(size, initialValue = 0) {
  return Array.from({ length: size }, () => Array(size).fill(initialValue));
}

//счёт расстояний между точками
function calculatePathLength(path) {
  let length = 0;
  for (let i = 0; i < path.length - 1; i++) {
    length += distances[path[i]][path[i + 1]];
  }
  length += distances[path[path.length - 1]][path[0]];//возврат в начало
  return length;
}

// обнов. феромоны, учитывая испарения + новые пути
function updatePheromones(paths, lengths) {
  for (let i = 0; i < pheromones.length; i++) {
    for (let j = 0; j < pheromones[i].length; j++) {
      pheromones[i][j] *= (1 - evaporationRate);
    }
  }

  paths.forEach((path, i) => {
    const length = lengths[i];
    for (let j = 0; j < path.length - 1; j++) {
      const [u, v] = [path[j], path[j + 1]];
      pheromones[u][v] += 1 / length;
      pheromones[v][u] += 1 / length;
    };
    const [last, first] = [path[path.length - 1], path[0]];
    pheromones[last][first] += 1 / length;
    pheromones[first][last] += 1 / length;
  });
}
//рисовалка
function renderPoints() {
  points.forEach((point, i) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "black";
    ctx.fill();
    ctx.fillText(i + 1, point.x + 5, point.y - 5);//подписываю точки
  });
}
//лучший путь-рисовалка красным
function renderBestPath(path) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // рисуем все серые пути
  renderAllPaths(allPathsOfAllIterations);

  renderPoints();

  // рисуем только лучший путь (красный)
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(points[path[0]].x, points[path[0]].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(points[path[i]].x, points[path[i]].y);
  }
  ctx.lineTo(points[path[0]].x, points[path[0]].y);
  ctx.stroke();
}

function renderAllPaths(paths) {
  ctx.strokeStyle = "rgba(185, 185, 185, 0.4)";  // Серые пути
  ctx.lineWidth = 1;
  paths.forEach((iterationPaths) => {
    iterationPaths.forEach(path => {
      ctx.beginPath();
      ctx.moveTo(points[path[0]].x, points[path[0]].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(points[path[i]].x, points[path[i]].y);
      }
      ctx.lineTo(points[path[0]].x, points[path[0]].y);
      ctx.stroke();
    });
  });
}

//анимация красного пути(теперь он зеленый....)
function animateBestPath(path) {
  renderPoints();
  let step = 0;
  const interval = setInterval(() => {
    const from = points[path[step]];
    const to = step + 1 < path.length ? points[path[step + 1]] : points[path[0]];
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;
    ctx.stroke();
    step++;
    if (step === path.length) clearInterval(interval);
  }, 200);//каждый шаг через 200 мс
}
