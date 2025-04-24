const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 500;

let points = [];
let clusters = [];

const metricSelect = document.getElementById("metric");

canvas.addEventListener("click", function (e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    //добавление точки
    points.push({ x, y, cluster: null });
    drawPoints();
});

//проверка ввода не меньше 1, не больше 100
document.getElementById('clusters').addEventListener('input', function () {
    let value = parseInt(this.value);
    if (isNaN(value) || value < 1) this.value = 1;
    if (value > 100) this.value = 100;
});

document.getElementById("start").addEventListener("click", () => {
    const k = parseInt(document.getElementById("clusters").value);
    //проверка k
    if (k < 1 || k > points.length) {
        alert("Введите корректное количество кластеров (1 - " + points.length + ")");
        return;
    }
    const metric = metricSelect.value;
    kMeansClustering(k, metric);
});

document.getElementById("clear").addEventListener("click", () => {
    points = [];
    clusters = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

//сравнение метрик
document.getElementById("compare").addEventListener("click", () => {
    const k = parseInt(document.getElementById("clusters").value);
    if (points.length === 0 || k < 1 || k > points.length) {
        alert("Недостаточно точек или некорректное значение K");
        return;
    }
    
    const original = points.map(p => ({ ...p }));
    const results = {};
    const colors = {
        euclidean: [],
        manhattan: [],
        chebyshev: []
    };
    //кластеризация для каждой метрики
    ["euclidean", "manhattan", "chebyshev"].forEach(metric => {
        points.forEach(p => p.cluster = null);
        kMeansClustering(k, metric, true);

        results[metric] = points.map(p => p.cluster);
        colors[metric] = [...clusters.map(c => c.color)];
    });
    //восстанов. оригинала + сравнение
    points = original;
    drawMetricComparison(results, colors);
});

//функция расстояний
function getDistance(a, b, metric) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    switch (metric) {
        case "euclidean": // Обычное расстояние √(dx² + dy²)
            return Math.hypot(dx, dy); 
        case "manhattan": // Сумма модулей |dx| + |dy|
            return Math.abs(dx) + Math.abs(dy);
        case "chebyshev": // Максимум из модулей max(|dx|, |dy|)
            return Math.max(Math.abs(dx), Math.abs(dy));
        default:
            return Math.hypot(dx, dy);
    }
}

function getRandomColor() {
    return `hsl(${Math.random() * 360}, 100%, 55%)`;
}

function initializeClusters(k) {
    clusters = [];
    const shuffled = [...points].sort(() => Math.random() - 0.5);
    for (let i = 0; i < k; i++) {
        clusters.push({ x: shuffled[i].x, y: shuffled[i].y, color: getRandomColor() });
    }
}

//точки-кластеры
function assignPointsToClusters(metric) {
    points.forEach(p => {
        let minDist = Infinity;
        let clusterIndex = 0;
        //ближайший центр
        clusters.forEach((c, i) => {
            const dist = getDistance(p, c, metric);
            if (dist < minDist) {
                minDist = dist;
                clusterIndex = i;
            }
        });
        p.cluster = clusterIndex;
    });
}

function updateClusterCenters() {
    clusters.forEach((c, i) => {
        const assigned = points.filter(p => p.cluster === i);
        if (assigned.length) {
            //новый центр - среднее всех
            c.x = assigned.reduce((sum, p) => sum + p.x, 0) / assigned.length;
            c.y = assigned.reduce((sum, p) => sum + p.y, 0) / assigned.length;
        }
    });
}

function drawPoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    points.forEach(p => {
        ctx.fillStyle = p.cluster !== null ? clusters[p.cluster].color : "#222";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
    //БОЛЬШИЕ!!!
    clusters.forEach(c => {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });
}

//отрисовка сравнений
function drawMetricComparison(results, colors) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const offset = 6;//смещение

    points.forEach((p, i) => {
        const dxs = [-offset, 0, offset];
        const metrics = ["euclidean", "manhattan", "chebyshev"];

        metrics.forEach((metric, idx) => {
            const clusterIndex = results[metric][i];
            const color = colors[metric][clusterIndex];

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x + dxs[idx], p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    });
}
//отображение букв метрик рядом с центрами кластеров
function drawMetricLabels() {
    const metric = metricSelect.value;
    clusters.forEach(c => {
        ctx.fillStyle = "#000";
        ctx.font = "12px Arial";
        if (metric === "euclidean") {
            ctx.fillText("E", c.x + 5, c.y - 5);
        } else if (metric === "manhattan") {
            ctx.fillText("M", c.x + 5, c.y - 5); 
        } else if (metric === "chebyshev") {
            ctx.fillText("C", c.x + 5, c.y - 5);
        }
    });
}

function kMeansClustering(k, metric = "euclidean", silent = false) {
    initializeClusters(k);
    let changed = true;

    while (changed) {
        const prev = JSON.stringify(points.map(p => p.cluster)); 
        assignPointsToClusters(metric);
        updateClusterCenters(); 
        const curr = JSON.stringify(points.map(p => p.cluster)); 
        changed = prev !== curr; 

        if (!silent) {
            drawPoints(); 
            drawMetricLabels();
        }
    }

    if (!silent) {
        drawPoints(); 
        drawMetricLabels();
    }
}
