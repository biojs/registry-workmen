var registry = require("npm-registry");
var q = require('bluebird');

// callback will be called if all packages and their depends are downloaded
var info = function(name, npm) {
  if (npm === undefined) {
    npm = new registry();
  }
  this.npm = npm;
  return this.get(name);
};

info.prototype.get = function(name) {
  var self = this;

  return new q.Promise(function(resolve, reject) {

    self.npm.packages.get(name, function(err, package) {
      if (err) {
        reject(err);
        return;
      }

      package = package[0];
      delete package._id;

      // nedb does not like dots in the key
      delete package.time;
      if(isNaN(package.releases)){
        package.releases = Object.keys(package.releases).length;
      }
      if(isNaN(package.versions)){
        package.versions = Object.keys(package.versions).length;
      }

      resolve(package);

      return package;
    });
  });
};

module.exports = info;
