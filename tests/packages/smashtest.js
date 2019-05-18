const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const util = require('util');
const utils = require('../../utils.js');
const { spawnSync } = require('child_process');

describe("smashtest.js", function() {
    this.timeout(30000);

    it.skip("TEXT", function() {
        const cmd = spawnSync('node', ['../../smashtest', '../../testfile1.txt']);
        console.log(cmd.stdout.toString());
    });
});
