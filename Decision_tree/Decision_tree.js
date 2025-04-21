let tree = null;
let headers = [];

document.getElementById('build-tree').addEventListener('click', () => {
  const csv = document.getElementById('training-data').value.trim();
  const rows = csv.split('\n').map(line => line.split(',').map(cell => cell.trim()));
  const errorMessageElement = document.getElementById('error-message');

  // Проверка на ошибки в формате CSV
  if (rows.length < 2) {
    errorMessageElement.textContent = "Ошибка: Необходимо больше данных для обучения!";
    return;
  }

  const columnCount = rows[0].length;
  if (!rows.every(row => row.length === columnCount)) {
    errorMessageElement.textContent = "Ошибка: Каждая строка должна иметь одинаковое количество столбцов!";
    return;
  }

  headers = rows[0];
  const data = rows.slice(1).map(row =>
    Object.fromEntries(headers.map((key, i) => [key, row[i]]))
  );

  const features = headers.slice(0, -1);
  const target = headers.at(-1);

  tree = buildTree(data, features, target);

  const container = document.getElementById('tree-display');
  container.innerHTML = '';
  renderTree(tree, container);

  errorMessageElement.textContent = ''; // Скрыть ошибку, если всё правильно
});

document.getElementById('classify').addEventListener('click', () => {
  if (!tree) return;

  const values = document.getElementById('test-input').value.trim().split(',');
  if (values.length !== headers.length - 1) {
    document.getElementById('result').textContent = "Ошибка: Количество признаков в тестовом примере не совпадает с количеством обучающих признаков!";
    return;
  }

  const sample = Object.fromEntries(headers.slice(0, -1).map((key, i) => [key, values[i]]));

  // Классификация с выводом пути
  const { result, path } = classify(sample, tree);
  
  // Выводим путь и результат
  document.getElementById('result').innerHTML = `Результат: ${result}<br>Путь: ${path.join(' → ')}`;

  // Отображаем путь на дереве
  const container = document.getElementById('tree-display');
  container.innerHTML = '';
  renderTree(tree, container, path);
});

function entropy(rows, target) {
  const total = rows.length;
  const counts = {};

  for (let row of rows) {
    const label = row[target];
    counts[label] = (counts[label] || 0) + 1;
  }

  return Object.values(counts).reduce((sum, count) => {
    const p = count / total;
    return sum - p * Math.log2(p);
  }, 0);
}

function bestSplit(rows, features, target) {
  const baseEntropy = entropy(rows, target);
  let best = null;
  let bestGain = 0;

  for (let feature of features) {
    const values = new Set(rows.map(row => row[feature]));
    const gain = [...values].reduce((sum, value) => {
      const subset = rows.filter(row => row[feature] === value);
      return sum + (subset.length / rows.length) * entropy(subset, target);
    }, 0);

    const infoGain = baseEntropy - gain;
    if (infoGain > bestGain) {
      bestGain = infoGain;
      best = feature;
    }
  }

  return best;
}

function majorityLabel(rows, target) {
  const counts = {};
  for (let row of rows) {
    const label = row[target];
    counts[label] = (counts[label] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function buildTree(rows, features, target) {
  const labels = new Set(rows.map(row => row[target]));

  if (labels.size === 1) return [...labels][0];
  if (!features.length) return majorityLabel(rows, target);

  const best = bestSplit(rows, features, target);
  const tree = { feature: best, branches: {} };

  for (let value of new Set(rows.map(row => row[best]))) {
    const subset = rows.filter(row => row[best] === value);
    const remaining = features.filter(f => f !== best);
    tree.branches[value] = buildTree(subset, remaining, target);
  }

  return tree;
}

function renderTree(node, container, highlightedPath = []) {
  if (typeof node === 'string') {
    const leaf = document.createElement('div');
    leaf.className = 'tree-leaf';
    leaf.innerHTML = `╰┈➤ <strong>Ответ:</strong> ${node}`;
    container.appendChild(leaf);
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'tree-branch-list';

  for (let [value, subtree] of Object.entries(node.branches)) {
    const li = document.createElement('li');
    li.className = 'tree-node';

    const isHighlighted = highlightedPath.length > 0 && highlightedPath[0] === value;
    const label = document.createElement('div');
    label.className = 'tree-branch';
    label.style.backgroundColor = isHighlighted ? '#ffeb3b' : '#ffffffc7';
    label.innerHTML = `<strong>${node.feature}</strong> = <em>${value}</em>`;

    li.appendChild(label);

    // Передаём оставшийся путь, если он совпадает
    const nextPath = isHighlighted ? highlightedPath.slice(1) : [];
    renderTree(subtree, li, nextPath);
    ul.appendChild(li);
  }

  container.appendChild(ul);
}


function classify(sample, node, path = []) {
  if (typeof node === 'string') {
    return { result: node, path };
  }

  const value = sample[node.feature];
  const next = node.branches[value];
  if (next) {
    path.push(value);
    return classify(sample, next, path);
  }

  return { result: 'Неизвестно', path };
}
