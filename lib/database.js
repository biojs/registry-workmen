/*
 * biojs-registry-database
 * https://github.com/biojs/biojs-registry-database
 *
 * Copyright (c) 2014 BioJS
 * Licensed under the Apache 2
 */

var traverse = require('traverse');
var q = require('bluebird');
var genericdb = require("./genericdb");
var util = require('util');

var database = function(opts) {
  this.log = opts.log;
  this.neCacheName = __dirname + '/../.necache';
  this.mongoCollection = "npmcache";
  this.neCacheIndex = function(db) {
    // name has to be uniq
    db.ensureIndex({
      fieldName: 'name',
      unique: true,
      sparse: true
    });
  };
  this.mongoIndex = function(npmcoll, resolve, reject) {
    return npmcoll.ensureIndex({
      "name": 1
    }, {
      unique: true
    }, resolve);
  };
};

genericdb.mixin(database.prototype);

database.prototype.load = function() {
  return this.loadDB().then(this.loadCache.bind(this));
};

// load cache
// TODO: currently just deletes the old cache
database.prototype.loadCache = function() {
  var self = this;
  return new q.Promise(function(resolve, reject) {
    //self.db().find({}).exec(function (err, docs) {
    //self.reload(docs);
    //resolve();
    //});
    self.db().remove({}, function(err, numRemoved) {
      if(err){
        reject(err);
      }
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
  if (typeof pkg === "undefined") {
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
