/*
 * biojs-registry-workmen
 * https://github.com/biojs/biojs-registry-workmen
 *
 * Copyright (c) 2014 BioJS
 * Licensed under the Apache 2
 */

var registry = require("npm-registry");
var npm = new registry();
var Datastore = require('nedb');
var info = require("./npm");
var github = require('./github');

var workmen = function(callback){
  var keywords = ['biojs'];
  this.callback = callback;
  this.db = new Datastore({ filename: __dirname + '/../.necache', autoload: true });
  // name has to uniq
  this.db.ensureIndex({ fieldName: 'name', unique: true, sparse: true });
  self = this;


  this.info = new info(self.save, keywords);

  // load additional info crawlers

  var gitInstance = new github(this.info);

  this.loadCache();
}

// load cache
workmen.prototype.loadCache = function(){
  self.db.find({}).exec(function (err, docs) {
    self.reload(docs);
  });
};

workmen.prototype.reload = function(existPkgs){
  // TODO: use cache
  self.db.remove({}, {}, function (err, numRemoved) {});
  npm.packages.keyword('biojs', function(err, packages){
    if(err != undefined){
      console.log(err); return;
    }
    self.info.start(packages);
  });
};


workmen.prototype.save = function(pkgs){
  console.log("saving db");
  var counts = 0;
  var expected = Object.keys(pkgs).length; 
  var finalTrigger = function(){
    counts++;
    if(expected == counts){
      self.callback(pkgs, self.db);
    }
  }

  for(var i in pkgs){
    self.db.update({ name: pkgs[i] }, pkgs[i], { upsert: true }, function (err, numReplaced, upsert) {
      finalTrigger();
    });
  }
}

module.exports = workmen;
