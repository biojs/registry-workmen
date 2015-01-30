/*
 * biojs-registry-database
 * https://github.com/biojs/biojs-registry-database
 *
 * Copyright (c) 2014 BioJS
 * Licensed under the Apache 2
 */

var mquery = require('mquery');
var traverse = require('traverse');
var q = require('bluebird');

var database = function(opts) {
  this.log = opts.log;
};

database.prototype.load = function() {
  // load additional info crawlers
  var p;
  if (this.isMongo()) {
    p = this.loadMongo();
  } else {
    p = this.loadNeDB();
  }
  return p.then(this.loadCache.bind(this));
};

// for local testing mongolite (aka nedb)
database.prototype.loadNeDB = function() {
  var Datastore = require('nedb');
  this._db = new Datastore({
    filename: __dirname + '/../.necache',
    autoload: true
  });
  // name has to uniq
  this._db.ensureIndex({
    fieldName: 'name',
    unique: true,
    sparse: true
  });
  this._db.findOneAndUpdate = this._db.update;
  return q.resolve();
};

// url to a real mongo instance
database.prototype.getMongoUri = function() {
  return process.env.MONGOLAB_URI ||
    process.env.MONGOHQ_URL || 'mongodb://localhost/test';
};

database.prototype.isMongo = function() {
  if (process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || process.env.MONGO) {
    return true;
  }
  return false;
};

// inits the db
database.prototype.loadMongo = function() {
  var mongo = require('mongodb');
  var self = this;
  return new q.Promise(function(resolve) {
    self.log.info("connectiong to mongo %s", self.getMongoUri());
    mongo.Db.connect(self.getMongoUri(), function(err, dbM) {
      if(err){
        self.log.error(err);
      }
      var npmcache = dbM.collection('npmcache');
      self._mdb = npmcache;

      npmcache.ensureIndex({
        "name": 1
      }, {
        unique: true
      }, resolve);
    });
  });
};

// mquery needs to wrap every db request
database.prototype.db = function() {
  if (this._mdb !== undefined) {
    return mquery(this._mdb);
  } else {
    return this._db;
  }
};

// load cache
// TODO: currently just deletes the old cache
database.prototype.loadCache = function() {
  var self = this;
  return new q.Promise(function(resolve) {
    //self.db().find({}).exec(function (err, docs) {
    //self.reload(docs);
    //resolve();
    //});
    self.db().remove({}, function(err, numRemoved) {
      resolve();
    });
  });
};

// TODO: save all in one operation
database.prototype.save = function(pkgs) {

  this.log.info("db: saving " + pkgs.length);
  return q.all(pkgs.map(function(pkg) {
    return this.updatePkg(pkg);
  }.bind(this)));
};

database.prototype.updatePkg = function(pkg) {
  var self = this;
  if(typeof pkg === "undefined"){
    return q.reject("undefined pkg name");
  }
  // required for mongodb
  this.cleanPackage(pkg);
  return new q.Promise(function(resolve, reject) {
    self.db().findOneAndUpdate({
      name: pkg.name
    }, pkg, {
      upsert: true
    }, function(err, numReplaced, upsert) {
      if (err) reject(err);
      resolve();
    });
  });
};

// mongodb hates . and $
// we must replace all dots with the UTF8 char
database.prototype.cleanPackage = function(pkg) {
  traverse(pkg).forEach(function(prop) {
    if (this.key && this.key.indexOf(".") >= 0) {

      // TODO: this is very dirty
      delete this.parent.node_[this.key];
      this.key = this.key.replace(/\./g, "\uff0E");
      this.parent.node_[this.key] = prop;
    }
  });
};

module.exports = database;
