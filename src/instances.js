const Tree = require('./tree.js');
const Runner = require('./runner.js');
const Reporter = require('./reporter.js');

let tree, runner, reporter = null
if(tree === null && runner === null && report === null){
  tree = new Tree();
  runner = new Runner();
  reporter = new Reporter(tree, runner);
}


module.exports = {runner, tree, reporter}