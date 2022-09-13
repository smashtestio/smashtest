import Reporter from './reporter.js';
import Runner from './runner.js';
import Tree from './tree.js';

export const tree = new Tree();
export const runner = new Runner(tree);
export const reporter = new Reporter(tree, runner);
