const Tree = require('./tree.js');
const Runner = require('./runner.js');
const Reporter = require('./reporter.js');

const tree = new Tree();
const runner = new Runner();
const reporter = new Reporter(tree, runner);

module.exports = {runner, tree, reporter};