const chai = require('chai');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const utils = require('../../utils.js');
const { spawnSync } = require('child_process');

chai.use(chaiSubset);

describe("smashtest.js", function() {
    it.only("TEXT", function() {
        const cmd = spawnSync('node', ['../../smashtest', '../../testfile1.txt']);
        console.log(cmd.stdout.toString());
    });
});
