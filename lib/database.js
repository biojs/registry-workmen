/*
 * biojs-registry-database
 * https://github.com/biojs/biojs-registry-database
 *
 * Copyright (c) 2014 BioJS
 * Licensed under the Apache 2
 */

var mquery = require('mquery');
var _ = require('lodash'); 
var traverse = require('traverse');
var q = require('bluebird');

var database = function(){
}

database.prototype.load = function(){
  // load additional info crawlers
  var p;
  if(this.isMongo()){
    p = this.loadMongo();
  }else{
    p = this.loadNeDB();
  }
  return p.then(this.loadCache.bind(this));
}

// for local testing mongolite (aka nedb)
database.prototype.loadNeDB = function(){
  var Datastore = require('nedb');
  this._db = new Datastore({ filename: __dirname + '/../.necache', autoload: true });
  // name has to uniq
  this._db.ensureIndex({ fieldName: 'name', unique: true, sparse: true });
  this._db.findOneAndUpdate = this._db.update;
  return q.resolve();
}

// url to a real mongo instance
database.prototype.getMongoUri = function(){
  return mongoUri = process.env.MONGOLAB_URI ||
    process.env.MONGOHQ_URL || 'mongodb://localhost/test';
}

database.prototype.isMongo = function(){
  if( process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || process.env.MONGO ){
    return true;
  }
  return false;
}

// inits the db
database.prototype.loadMongo = function(){
  var mongo = require('mongodb');
  return new q.Promise(function(resolve,reject){
    mongo.Db.connect(this.getMongoUri(), function (err, dbM) {
      var npmcache = dbM.collection('npmcache');
      self._mdb = npmcache;

      npmcache.ensureIndex( { "name": 1 }, { unique: true }, callback)

      resolve();
    });
  })
};

// mquery needs to wrap every db request
database.prototype.db = function(){
  if(this._mdb !== undefined){
    return mquery(this._mdb);
  }else{
    return this._db;
  }
}

// load cache
// TODO: currently just deletes the old cache
database.prototype.loadCache = function(){
  var self = this;
  return new q.Promise(function(resolve,reject){
      //self.db().find({}).exec(function (err, docs) {
      //self.reload(docs);
      //resolve();
      //});
      self.db().remove({}, function (err, numRemoved) {
        resolve();
      });
  });
};

// TODO: save all in one operation
database.prototype.save = function(pkgs){
  var self = this;

  // required for mongodb
  self.cleanPackage(pkgs);

  console.log("db: saving "+ pkgs.length);

  var ps = [];

  pkgs.forEach(function(pkg){
    ps.push(new q.Promise(function(resolve,reject){
      self.db().findOneAndUpdate({ name: pkg.name }, pkg, { upsert: true }, function (err, numReplaced, upsert) {
        resolve();
      });
    }));
  });

  return q.all(ps);
}

// mongodb hates . and $
// we must replace all dots with the UTF8 char
database.prototype.cleanPackage = function(pkgs){
  traverse(pkgs).forEach(function (prop) { if (this.key && this.key.indexOf(".") >= 0){

      // TODO: this is very dirty
      var neObj = this.parent;
      delete this.parent.node_[this.key];

      this.key = this.key.replace(".", "\uff0E");
      this.parent.node_[this.key] = prop;
    }
  });
}

module.exports = database;
