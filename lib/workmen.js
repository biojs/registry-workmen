/*
 * biojs-registry-workmen
 * https://github.com/biojs/biojs-registry-workmen
 *
 * Copyright (c) 2014 BioJS
 * Licensed under the Apache 2
 */

var registry = require("npm-registry");
var npm = new registry();
var info = require("./npm");
var github = require('./github');
var mquery = require('mquery');

var workmen = function(callback){
  var keywords = ['biojs'];
  this.callback = callback;
  self = this;

  this.info = new info(self.save, keywords);

  // load additional info crawlers

  var gitInstance = new github(this.info);

  if(this.isMongo()){
    this.loadMongo(this.loadCache);
  }else{
    this.loadNeDB(this.loadCache);
  }
}

workmen.prototype.loadNeDB= function(callback){
  var Datastore = require('nedb');
  this._db = new Datastore({ filename: __dirname + '/../.necache', autoload: true });
  // name has to uniq
  this._db.ensureIndex({ fieldName: 'name', unique: true, sparse: true });
  this._db.findOneAndUpdate = this._db.update;
  callback();
}
workmen.prototype.getMongoUri = function(){
  return mongoUri = process.env.MONGOLAB_URI ||
    process.env.MONGOHQ_URL || 'mongodb://localhost/test';
}

workmen.prototype.isMongo = function(){
  if( process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || process.env.MONGO ){
    return true;
  }
  return false;
}

workmen.prototype.loadMongo = function(callback){
  var mongo = require('mongodb');

  mongo.Db.connect(this.getMongoUri(), function (err, dbM) {
    var npmcache = dbM.collection('npmcache');
    self._mdb = npmcache;

    npmcache.ensureIndex( { "name": 1 }, { unique: true }, callback)
    //callback();
  });
};

workmen.prototype.db = function(){
  if(self._mdb !== undefined){
    return mquery(self._mdb);
  }else{
    return self._db;
  }
}

// load cache
workmen.prototype.loadCache = function(){
  self.db().find({}).exec(function (err, docs) {
    self.reload(docs);
  });
};

workmen.prototype.reload = function(existPkgs){
  // TODO: use cache
  self.db().remove({}, function (err, numRemoved) {});
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
    self.db().findOneAndUpdate({ name: pkgs[i] }, pkgs[i], { upsert: true }, function (err, numReplaced, upsert) {
      finalTrigger();
    });
  }
}

module.exports = workmen;
