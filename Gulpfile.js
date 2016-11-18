/*
 * biojs-registry-workmen
 * https://github.com/biojs/biojs-registry-workmen
 *
 * Copyright (c) 2014 BioJS
 * Licensed under the Apache 2 license
 */

'use strict';

var gulp = require('gulp');
var mocha = require('gulp-mocha');
require("./test/mochaFix.js");

// Copy all static images
gulp.task('mocha', function () {
  return gulp.src('./test/*.js')
    .pipe(mocha({
      globals: ['chai'],
      // timeout: 6000,
      timeout: 30000,
      ignoreLeaks: false,
      useColors: false,
      ui: 'bdd',
      reporter: 'spec'
    }));
});

// Rerun the task when a file changes
gulp.task('watch', function () {
  gulp.watch(['./lib/**/*.js', './test/**/*.js', '*.js'], ['test']);
});

gulp.task('test', ["mocha"]);

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['mocha', 'watch']);
