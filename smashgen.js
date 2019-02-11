'use strict';

var webdriverio = require('webdriverio');
var glob = require('glob');
var readFiles = require('read-files-promise');
var util = require('util');

var Tree = require('./tree.js');

var tree = new Tree();

process.argv.forEach(function(val, index, array) { // when index is 2, val is the filename glob that's passed in from command line
    if(index == 2) {
        glob(val, function(err, filenames) { // generates array of filenames covered by globs (directories/wildcards) in val
            if(err) {
                throw err;
            }

            if(!filenames) {
                throw "Bad filename(s)";
            }

            readFiles(filenames, {encoding: 'utf8'})
                .then(function(fileBuffers) {
                    if(fileBuffers.length == 0) {
                        throw "No files found";
                    }

                    for(var i = 0; i < fileBuffers.length; i++) {
                        tree.parseIn(fileBuffers[i], filenames[i]);
                    }



                    // TODO: run the tests here





                    // TODO: get rid of this
                    print(tree.root);
                })
                .catch(function(err) {
                    console.error(err);
                });
        });
    }
});

/**
 * Outputs obj to console.log
 */
function print(obj) {
    console.log(util.inspect(obj, false, null, true));
}
