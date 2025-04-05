let map = [], start = null, end = null;
let isDrawingWalls = false;

document.getElementById('generate-map').addEventListener('click', generateMap);
document.getElementById('generate-maze').addEventListener('click', generateMaze);
document.getElementById('start-pathfinding').addEventListener('click', startPathfinding);
document.getElementById('clear-map').addEventListener('click', clearMap);
document.getElementById('toggle-instruction').addEventListener('click', toggleInstruction);

document.getElementById('size').addEventListener('input', function () {
    let value = parseInt(this.value);
    if (isNaN(value) || value < 2) this.value = 2;
    if (value > 50) this.value = 50;
});

function generateMap() {
    const size = +document.getElementById('size').value;
    map = [];
    const container = document.getElementById('map');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${size}, 40px)`;
    container.style.gridTemplateRows = `repeat(${size}, 40px)`;

    for (let row = 0; row < size; row++) {
        const rowArray = [];
        for (let col = 0; col < size; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('mousedown', () => handleCellClick(cell, row, col));
            cell.addEventListener('mouseover', () => {
                if (isDrawingWalls) cell.classList.add('wall');
            });
            rowArray.push(cell);
            container.appendChild(cell);
        }
        map.push(rowArray);
    }

    document.addEventListener('mousedown', () => isDrawingWalls = true);
    document.addEventListener('mouseup', () => isDrawingWalls = false);
}

function handleCellClick(cell, row, col) {
    if (cell.classList.contains('start')) {
        start = null;
        cell.classList.remove('start');
    } else if (cell.classList.contains('end')) {
        end = null;
        cell.classList.remove('end');
    } else if (!start) {
        start = { row, col };
        cell.classList.add('start');
    } else if (!end) {
        end = { row, col };
        cell.classList.add('end');
    } else {
        cell.classList.toggle('wall');
    }
}

function startPathfinding() {
    if (!start || !end) return alert("Не установлены начальная и конечная точки!");

    const { visitedOrder, cameFrom } = bfs(map, start, end);

    animateExploration(visitedOrder, () => {
        const path = reconstructPath(cameFrom, end);
        if (path.length === 0) {
            alert("Путь не найден!");
        } else {
            animatePath(path);
        }
    });
}

function bfs(map, start, end) {
    const queue = [start];
    const cameFrom = {};
    const visited = new Set();
    const visitedOrder = [];

    visited.add(`${start.row},${start.col}`);

    while (queue.length > 0) {
        const current = queue.shift();
        visitedOrder.push(current);

        if (current.row === end.row && current.col === end.col) {
            break;
        }

        for (let neighbor of getNeighbors(current, map)) {
            const key = `${neighbor.row},${neighbor.col}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push(neighbor);
                cameFrom[key] = current;
            }
        }
    }

    return { visitedOrder, cameFrom };
}

function getNeighbors(cell, map) {
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    return directions.map(([dx, dy]) => ({
        row: cell.row + dx,
        col: cell.col + dy
    })).filter(({ row, col }) =>
        row >= 0 && col >= 0 &&
        row < map.length &&
        col < map[0].length &&
        !map[row][col].classList.contains('wall')
    );
}

function reconstructPath(cameFrom, end) {
    const path = [];
    let current = end;
    while (cameFrom[`${current.row},${current.col}`]) {
        path.push([current.row, current.col]);
        current = cameFrom[`${current.row},${current.col}`];
    }
    path.push([current.row, current.col]);
    return path.reverse();
}

function animateExploration(visitedOrder, onComplete) {
    visitedOrder.forEach((cell, index) => {
        setTimeout(() => {
            const element = map[cell.row][cell.col];
            if (!element.classList.contains('start') && !element.classList.contains('end')) {
                element.classList.add('visited');
            }
            if (index === visitedOrder.length - 1) {
                setTimeout(onComplete, 200);
            }
        }, index * 30);
    });
}

function animatePath(path) {
    path.forEach(([row, col], index) => {
        setTimeout(() => {
            const cell = map[row][col];
            if (!cell.classList.contains('start') && !cell.classList.contains('end')) {
                cell.classList.add('path');
            }
        }, index * 50);
    });
}

function generateMaze() {
    if (!start || !end) {
        alert("Сначала установите начальную и конечную точки!");
        return;
    }

    map.forEach(row => row.forEach(cell => {
        if (!cell.classList.contains('start') && !cell.classList.contains('end')) {
            cell.classList.toggle('wall', Math.random() > 0.7);
        }
    }));
}

function clearMap() {
    document.getElementById('map').innerHTML = '';
    start = null;
    end = null;
    map = [];
}

function toggleInstruction() {
    const instructionBox = document.getElementById('instruction-box');
    instructionBox.style.display = instructionBox.style.display === 'none' || instructionBox.style.display === '' ? 'block' : 'none';
}
