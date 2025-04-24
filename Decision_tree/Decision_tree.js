const trainingDataElem = document.getElementById('training-data');
const treeDisplayElem = document.getElementById('tree-display');
const resultElem = document.getElementById('result');
const errorElem = document.getElementById('error-message');
const testInputElem = document.getElementById('test-input');
const exampleDataBtn = document.getElementById('example-data');
const buildTreeBtn = document.getElementById('build-tree');
const classifyBtn = document.getElementById('classify');

let decisionTree = null;
let headers = [];

//мб добавить другой пример, добавил этот, т.к. он показывает, что я лучший вариант выбираю не по первому слову
exampleDataBtn.addEventListener('click', () => {
  const exampleData = `Погода,День недели,Есть компания,Поехал
солнечно,суббота,да,да
пасмурно,вторник,нет,нет
дождь,понедельник,да,нет
солнечно,вторник,да,да
солнечно,вторник,нет,нет`;
  
trainingDataElem.value = exampleData;
}); 
// построение дерева
buildTreeBtn.addEventListener('click', () => {
  const csvData = trainingDataElem.value.trim();
  const rows = csvData.split('\n').map(row => row.split(',').map(cell => cell.trim()));
  
  if (rows.length < 2) {
    showError("Нужно больше данных для обучения!");
    return;
  }
  
  headers = rows[0];
  const data = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => obj[header] = row[i]);
    return obj;
  });
  
  const features = headers.slice(0, -1);
  const target = headers[headers.length - 1];
  
  decisionTree = buildDecisionTree(data, features, target);
  renderTree(decisionTree, treeDisplayElem);
  showError("");
});

// классификация примера
classifyBtn.addEventListener('click', () => {
  if (!decisionTree) {
    showResult("Сначала постройте дерево!");
    return;
  }
  
  const inputValues = testInputElem.value.trim().split(',');
  if (inputValues.length !== headers.length - 1) {
    showResult(`Нужно ввести ${headers.length - 1} значения: ${headers.slice(0, -1).join(', ')}`);
    return;
  }
  
  const example = {};
  for (let i = 0; i < headers.length - 1; i++) {
    const header = headers[i];
    example[header] = inputValues[i].trim();
  }
  
  const { result, path } = classifyExample(example, decisionTree);
  showResult(`Результат: ${result}<br>Путь: ${path.join(' → ')}`); //результат
  
  renderTree(decisionTree, treeDisplayElem, path); //подсвечиваю
});

// построение дерева решений
function buildDecisionTree(data, features, target) {

  const uniqueClasses = [...new Set(data.map(item => item[target]))];
  if (uniqueClasses.length === 1) return uniqueClasses[0];
  
  if (features.length === 0) return findMostCommonClass(data, target);
  
  // находим лучшее для разделения
  const bestFeature = findBestSplit(data, features, target);
  const tree = { feature: bestFeature, branches: {} };
  
  const featureValues = [...new Set(data.map(item => item[bestFeature]))];
  for (const value of featureValues) {
    const subset = data.filter(item => item[bestFeature] === value);
    tree.branches[value] = buildDecisionTree(subset, features.filter(f => f !== bestFeature), target);
  }
  
  return tree;
}

// классификация примера
function classifyExample(example, node, path = []) {
  if (typeof node === 'string') {
    return { result: node, path };
  }
  
  const value = example[node.feature];
  
  if (!(value in node.branches)) {
    return { 
      result: "Неизвестное значение '" + value + "' для признака '" + node.feature + "'",
      path 
    };
  }
  
  path.push(`${node.feature}=${value}`);
  return classifyExample(example, node.branches[value], path);
}

// рисую дерево
function renderTree(node, container, highlightPath = []) {
  container.innerHTML = '';
  
  function drawNode(node, parentElement, currentPath = []) {
    if (typeof node === 'string') {
      const leaf = document.createElement('div');
      leaf.className = 'tree-leaf';
      if (JSON.stringify(currentPath) === JSON.stringify(highlightPath)) {
        leaf.style.backgroundColor = '#ffeb3b';
      }
      leaf.innerHTML = `╰┈➤ Ответ: <strong>${node}</strong>`;
      parentElement.appendChild(leaf);
      return;
    }
    
    const ul = document.createElement('ul');
    ul.className = 'tree-branch-list';
    
    for (const [value, subtree] of Object.entries(node.branches)) {
      const li = document.createElement('li');
      li.className = 'tree-node';
      
      const div = document.createElement('div');
      div.className = 'tree-branch';
      
      const isHighlighted = highlightPath.length > currentPath.length && 
                          highlightPath[currentPath.length] === `${node.feature}=${value}`;
      
      if (isHighlighted) div.style.backgroundColor = '#ffeb3b';
      div.innerHTML = `<strong>${node.feature}</strong> = <em>${value}</em>`;
      
      li.appendChild(div);
      drawNode(subtree, li, [...currentPath, `${node.feature}=${value}`]);
      ul.appendChild(li);
    }
    
    parentElement.appendChild(ul);
  }
  
  drawNode(node, container);
}
// выбираю лучший путь для разделения
function findBestSplit(data, features, target) {
  let bestFeature = features[0];
  let bestGain = 0;

  for (const feature of features) {
    // считаю какое количество раз каждое значение признака встречается с каждым классом
    const valueCounts = {};
    for (const item of data) {
      const val = item[feature];
      const cls = item[target];
      if (!valueCounts[val]) valueCounts[val] = {};
      valueCounts[val][cls] = (valueCounts[val][cls] || 0) + 1;
    }

    let score = 0;
    for (const val in valueCounts) {
      const classes = Object.values(valueCounts[val]);
      if (classes.length === 1) score += 10;
      else score -= classes.length;
    }

    if (score > bestGain) {
      bestGain = score;
      bestFeature = feature;
    }
  }

  return bestFeature;
}

function findMostCommonClass(data, target) {
  const counts = {};
  data.forEach(item => counts[item[target]] = (counts[item[target]] || 0) + 1);
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function showError(message) {
  errorElem.textContent = message;
}

function showResult(message) {
  resultElem.innerHTML = message;
}