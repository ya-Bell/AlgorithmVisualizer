const brain = require('brain.js');
const fs = require('fs');
const mnist = require('mnist');

const set = mnist.set(60000, 10000); // MNIST

const net = new brain.NeuralNetwork({
  hiddenLayers: [128, 64], // 2 скртых слоя по 128 и 64 нейрона
  inputSize: 784, // 28x28 = 784
  activation: 'relu', // вместо sigmoid используем relu, быстрее, чем sigmoid
  outputSize: 10, // 10 классов (0-9)
});
net.train(set.training, {
  errorThresh: 0.005, // ошибка 0.5%
  iterations: 20000, // 20 000 итераций
  log: true, // выводим лог в консоль
  logPeriod: 50, // каждые 50 итераций
  learningRate: 0.01 // скорость обучения
});

fs.writeFileSync('model.json', JSON.stringify(net.toJSON()));
console.log(' Модель сохранена!');

// проверка точности, сейчас где то 98 процентов, траблы с 9 все еще есть
let correct = 0;

set.test.forEach(sample => {
  const output = net.run(sample.input);
  const predicted = Object.entries(output).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  const expected = sample.output.findIndex(v => v === 1).toString();
  if (predicted === expected) correct++;
});

const accuracy = (correct / set.test.length) * 100;
console.log(`Точность на тестах: ${accuracy.toFixed(2)}%`);
