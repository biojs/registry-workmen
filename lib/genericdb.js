var q = require('bluebird');
var mquery = require('mquery');
var _ = require('underscore');

// this is a meta package that either sends requests to nedb (local key-value storage)
// or to a real mongodb instance
var database = {};
module.exports = database;

database.mixin = function(proto){
  _.extend(proto, database);
};

// url to a real mongo instance
database.getMongoUri = function() {
  return process.env.MONGOLAB_URI ||
    process.env.MONGOHQ_URL || 'mongodb://localhost/test';
};

database.isMongo = function() {
  if (process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || process.env.MONGO) {
    return true;
  }
  return false;
};

database.loadDB = function() {
  // load additional info crawlers
  var p;
  if (this.isMongo()) {
    p = this.loadMongo();
  } else {
    p = this.loadNeDB();
  }
  var self = this;
  return p.then(function(){
   self.loaded = true; 
  });
};

// for local testing mongolite (aka nedb)
database.loadNeDB = function() {
  var Datastore = require('nedb');
  this._db = new Datastore({
    filename: this.neCacheName,
    autoload: true
  });
  if (this.neCacheIndex) {
    this.neCacheIndex(this._db);
  }
  this._db.findOneAndUpdate = this._db.update;
  return q.resolve();
};

// inits the db
database.loadMongo = function() {
  var mongo = require('mongodb');
  var self = this;
  return new q.Promise(function(resolve, reject) {
    self.log.info("connecting to mongo %s");
    mongo.Db.connect(self.getMongoUri(), function(err, dbM) {
      if (err) {
        self.log.error(err);
        reject(err);
      }
      var npmcache = dbM.collection(this.mongoCollection);
      self._mdb = npmcache;
      if (this.mongoIndex) {
        this.mongoIndex(npmcache, resolve, reject);
      }
    });
  });
};

// mquery needs to wrap every db request
database.db = function() {
  if (this._mdb !== undefined) {
    return mquery(this._mdb);
  } else {
    return this._db;
  }
};
