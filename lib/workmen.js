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
var _ = require('lodash'); 
var traverse = require('traverse');
var q = require('rsvp');

var workmen = function(callback){
  this.keywords = ['biojs', 'bionode'];
  this.callback = callback;
  self = this;

  this.info = new info(self.save, self.keywords);

  // load additional info crawlers

  var gitInstance = new github(this.info);

  if(this.isMongo()){
    this.loadMongo(this.loadCache);
  }else{
    this.loadNeDB(this.loadCache);
  }
}

// for local testing mongolite (aka nedb)
workmen.prototype.loadNeDB= function(callback){
  var Datastore = require('nedb');
  this._db = new Datastore({ filename: __dirname + '/../.necache', autoload: true });
  // name has to uniq
  this._db.ensureIndex({ fieldName: 'name', unique: true, sparse: true });
  this._db.findOneAndUpdate = this._db.update;
  callback();
}

// url to a real mongo instance
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

// inits the db
workmen.prototype.loadMongo = function(callback){
  var mongo = require('mongodb');

  mongo.Db.connect(this.getMongoUri(), function (err, dbM) {
    var npmcache = dbM.collection('npmcache');
    self._mdb = npmcache;

    npmcache.ensureIndex( { "name": 1 }, { unique: true }, callback)
  });
};

// mquery needs to wrap every db request
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

// downloads all packages found for the defined keywords
workmen.prototype.reload = function(existPkgs){
  // TODO: use cache
  self.db().remove({}, function (err, numRemoved) {});

  var pkgs = [];

  function downloadKeys(keyword){
    return new q.Promise(function(resolve,reject){
      npm.packages.keyword(keyword, function(err, packages){
        if(err == undefined){
          console.log("received keyword:", keyword);
          for(var i in packages){
            pkgs.push(packages[i]);
          }
        }else{
          console.log("err", err);
        }
        resolve(packages);
      });
    });
  }

  var ps = [];

  for(var index in self.keywords){
    console.log("started keyword:", self.keywords[index]);
    ps.push(downloadKeys(self.keywords[index]));
  }

  q.all(ps).then(function(){
    pkgs = _.uniq(pkgs, "name");
    console.log("packages found:", pkgs.length);
    self.info.start(pkgs);
  });

}

// TODO: save all in one operation
workmen.prototype.save = function(pkgs){
  console.log("saving db");

  // required for mongodb
  self.cleanPackage(pkgs);
  var ps = [];

  for(var i in pkgs){
    ps.push(new q.Promise(function(resolve,reject){
      self.db().findOneAndUpdate({ name: pkgs[i].name }, pkgs[i], { upsert: true }, function (err, numReplaced, upsert) {
        resolve();
      });
    }));
  }

  q.all(ps).then(function(){
    self.callback(pkgs, self.db);
  });
}

// mongodb hates . and $
// we must replace all dots with the UTF8 char
workmen.prototype.cleanPackage = function(pkgs){
  traverse(pkgs).forEach(function (prop) {
    if (this.key && this.key.indexOf(".") >= 0){

      // TODO: this is very dirty
      var neObj = this.parent;
      delete this.parent.node_[this.key];

      this.key = this.key.replace(".", "\uff0E");
      this.parent.node_[this.key] = prop;
    }
  });
}

module.exports = workmen;