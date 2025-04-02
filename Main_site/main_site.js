function loadAlgorithm(algorithm) {
    const contentDiv = document.getElementById("content");

    const algorithms = {
        "a_star": "<h2>Алгоритм A*</h2><p>ААААА</p>",
        "clustering": "<h2>Кластеризация</h2><p>БББББ</p>",
        "genetic": "<h2>Генетические алгоритмы</h2><p>ВВВВВ</p>",
        "ant": "<h2>Муравьиные алгоритмы</h2><p>ГГГГГ</p>",
        "solution_tree": "<h2>Дерево решений</h2><p>ДДДДД</p>",
        "neural_network": "<h2>Нейронные сети</h2><p>ЕЕЕЕЕ</p>",
    };
    contentDiv.innerHTML = algorithms[algorithm];
}
