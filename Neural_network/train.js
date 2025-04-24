const brain = require('brain.js');
const fs = require('fs');
const mnist = require('mnist');

const set = mnist.set(60000, 10000); // MNIST

const net = new brain.NeuralNetwork();
net.train(set.training, {
  errorThresh: 0.005,
  iterations: 20000,
  log: true,
  logPeriod: 50,
  learningRate: 0.3
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
