'use strict';

const webdriverio = require('webdriverio');
const glob = require('glob');
const readFiles = require('read-files-promise');
const util = require('util');
const Tree = require('./tree.js');

let tree = new Tree();

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

            glob('packages/*', function(err, packageFilenames) { // new array of filenames under packages/
                if(err) {
                    throw err;
                }

                if(!packageFilenames) {
                    // TODO: make sure this will work from any directory where you want to run smashtest from
                    throw "Make sure packages/ directory exists in the directory you're running this from";
                }

                let originalFilenamesLength = filenames.length;
                filenames = filenames.concat(packageFilenames);
                filenames = filenames.filter(filename => !filename.match(/\.js$/)); // remove js files

                readFiles(filenames, {encoding: 'utf8'})
                    .then(function(fileBuffers) {
                        if(fileBuffers.length == 0) {
                            throw "No files found";
                        }

                        for(let i = 0; i < fileBuffers.length; i++) {
                            tree.parseIn(fileBuffers[i], filenames[i], i >= originalFilenamesLength);
                        }

                        // TODO:
                        // 1) tree.parseIn() all the files under packages/
                        // 2) Call tree.generateBranches(with parameters from command line or vars)
                        // 3) Call create a new TestRunner and call run()






                    })
                    .catch(function(err) {
                        console.error(err);
                    });
            });
        });
    }
});
