/*
 * biojs-registry-workmen
 * https://github.com/biojs/biojs-registry-workmen
 *
 * Copyright (c) 2014 BioJS
 * Licensed under the Apache 2
 */


var registry = require("npm-registry");
var npm = new registry();

npm.packages.keyword('biojs', function(err, packages){
  console.log(packages);
});

console.log('hello world');
