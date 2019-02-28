'use strict';

const webdriverio = require('webdriverio');
const glob = require('glob');
const readFiles = require('read-files-promise');
const util = require('util');
const Tree = require('./tree.js');

var tree = new Tree();

if(process.argv.length < 3) {
    throw "No files inputted";
}

process.argv.forEach(function(val, index, array) { // when index is 2, val is the filename glob that's passed in from command line
    if(index == 2) {
        glob(val, function(err, filenames) { // generates array of filenames covered by globs (directories/wildcards) in val
            if(err) {
                throw err;
            }

            if(!filenames) {
                throw "Bad filename(s)";
            }

            glob('builtin/*', function(err, builtinFilenames) { // new array of filenames under builtin (our built-in functions)
                if(err) {
                    throw err;
                }

                if(!builtinFilenames) {
                    // TODO: make sure this will work from any directory where you want to run smashtest from
                    throw "Make sure builtin/ directory exists in the directory you're running this from";
                }

                var originalFilenamesLength = filenames.length;
                filenames = filenames.concat(builtinFilenames);

                readFiles(filenames, {encoding: 'utf8'})
                    .then(function(fileBuffers) {
                        if(fileBuffers.length == 0) {
                            throw "No files found";
                        }

                        for(var i = 0; i < fileBuffers.length; i++) {
                            tree.parseIn(fileBuffers[i], filenames[i], i >= originalFilenamesLength);
                        }

                        // TODO:
                        // 1) tree.parseIn() all the files under builtin/
                        // 2) Call tree.finalize()
                        // 3) Call create a new TestRunner and call runTests()





                        // TODO: get rid of this
                        print(tree.root);
                    })
                    .catch(function(err) {
                        console.error(err);
                    });
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
