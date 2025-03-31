let map = [], start = null, end = null;

document.getElementById('generate-map').addEventListener('click', generateMap);
document.getElementById('start-pathfinding').addEventListener('click', startPathfinding);
document.getElementById('clear-map').addEventListener('click', clearMap);

function generateMap() {
    const size = +document.getElementById('size').value;
    map = [];
    const container = document.getElementById('map');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${size}, 30px)`;
    container.style.gridTemplateRows = `repeat(${size}, 30px)`;

    for (let row = 0; row < size; row++) {
        const rowArray = [];
        for (let col = 0; col < size; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('click', () => handleCellClick(cell, row, col));
            rowArray.push(cell);
            container.appendChild(cell);
        }
        map.push(rowArray);
    }
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
    
    const path = bfs(map, start, end);
    if (path) {
        path.forEach(([row, col],index) => {
            if (row === end.row && col === end.col) return;
            map[row][col].classList.add('path');
        });
    } else {
        alert("Путь не найден!");
    }
}

function bfs(map, start, end) {
    const queue = [start];
    const cameFrom = {};
    const visited = new Set();

    visited.add(`${start.row},${start.col}`);

    while (queue.length > 0) {
        const current = queue.shift(); 

        if (current.row === end.row && current.col === end.col) {
            const path = [];
            let temp = current;
            while (cameFrom[`${temp.row},${temp.col}`]) {
                path.push([temp.row, temp.col]);
                temp = cameFrom[`${temp.row},${temp.col}`];
            }
            return path.reverse();
        }

        for (let neighbor of getNeighbors(current, map)) {
            if (!visited.has(`${neighbor.row},${neighbor.col}`)) {
                queue.push(neighbor);
                visited.add(`${neighbor.row},${neighbor.col}`);
                cameFrom[`${neighbor.row},${neighbor.col}`] = current;
            }
        }
    }
    return null; 
}

function getNeighbors(cell, map) {
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const neighbors = [];

    directions.forEach(([dx, dy]) => {
        const newRow = cell.row + dx;
        const newCol = cell.col + dy;

        if (newRow >= 0 && newCol >= 0 && newRow < map.length && newCol < map[0].length && !map[newRow][newCol].classList.contains('wall')) {
            neighbors.push({ row: newRow, col: newCol });
        }
    });

    return neighbors;
}

function clearMap() {
    document.getElementById('map').innerHTML = '';
    start = null;
    end = null;
    map = [];
}