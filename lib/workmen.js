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


  this.info = new info(self.save);

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
  npm.packages.keyword('biojs', function(err, packages){
    if(err != undefined){
      console.log(err); return;
    }
    self.info.start(packages);
  });
};


workmen.prototype.save = function(pkgs){
  console.log("saving db");
  for(var i in pkgs){
    self.db.update({ name: pkgs[i] }, pkgs[i], { upsert: true }, function (err, numReplaced, upsert) {
      //console.log("db saved", numReplaced, pkgs[i]);
    });
  }
  self.callback(pkgs);
  //self.db.find({}).sort({ planet: 1 }).skip(1).limit(2).exec(function (err, docs) {
}

module.exports = workmen;
