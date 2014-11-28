var registry = require("npm-registry");
var request = require('request');
var q = require('bluebird');

// callback will be called if all packages and their depends are downloaded
var info = function(pkg,keywords,npm){
  var self = this;

  if(npm == undefined){
    npm = new registry();
  }
  this.npm = npm;

  for(var key in keywords){
    keywords[key] = keywords[key].toLowerCase();
  }
  this.keywords = keywords;

  return this.get(pkg);
};

info.prototype.get = function(pkg){
  var counter = 0;
  var self = this;

  return new q.Promise(function(resolve,reject){

    self.npm.packages.get(pkg.name, function (err, package) {
      if(err) {
        reject(err)
      }

      pkg = package = package[0];
      delete package._id;

      // remove biojs keyword
      package.keywords = self.removeKeywords(package.keywords, self.keywords);

      // nedb does not like dots in the key
      delete package.time;
      package.releases = Object.keys(package.releases).length
      package.versions = Object.keys(package.versions).length

      resolve(package);
    });

  });
};

info.prototype.removeKeywords = function (keys, toRemove){
  var key = 0;
  while(key < keys.length){
    if(toRemove.indexOf(keys[key].toLowerCase()) >= 0){
      keys.splice(key, 1);
    }else{
      key++;
    }
  }
  return keys;
}

module.exports = info;
