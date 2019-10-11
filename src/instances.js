const Tree = require('./tree.js');
const Runner = require('./runner.js');
const Reporter = require('./reporter.js');

let tree = new Tree();
let runner = new Runner();
let reporter = new Reporter(tree, runner);

module.exports = {runner, tree, reporter};