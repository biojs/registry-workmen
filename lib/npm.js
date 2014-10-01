var registry = require("npm-registry");
var npm = new registry();
var request = require('request');
var dateFormat = require('dateformat');

// callback will be called if all packages and their depends are downloaded
var info = function(callback, keywords){
  var self = this;
  var evtCounts = {};

  self.on("single", self.getHistory);

  self.on("done", function(pkg){
    evtCounts[pkg.name]= (evtCounts[pkg.name] + 1) || 1;
    // TODO: assuming the existence of the hidden array might lead to unpredictable behavior
    var lastListener = (self.registeredListeners === evtCounts[pkg.name]);
    if(lastListener){
      self.remainingPkgs--;
      if(self.remainingPkgs == 0){
        callback(self.pkgs);
      }
    }
  });

  for(var key in keywords){
    keywords[key] = keywords[key].toLowerCase();
  }
  this.keywords = keywords;
};

info.prototype.start = function(exPkgs){

  if(exPkgs !== undefined){
    this.remainingPkgs = Object.keys(exPkgs).length;
    this.registeredListeners = this._events.single.length;
    this.get(exPkgs);
  }
};

info.prototype.get = function(exPkgs){
  var counter = 0;
  var self = this;
  self.pkgs = {};

  for(var i in exPkgs) {
    npm.packages.get(exPkgs[i].name, function (err, package) {
      package = package[0];
      delete package._id;

      // remove biojs keyword
      package.keywords = self.removeKeywords(package.keywords, self.keywords);

      // nedb does not like dots in the key
      delete package.time;
      package.releases = Object.keys(package.releases).length
      package.versions = Object.keys(package.versions).length

      self.pkgs[package.name] = package;
      self.trigger("single", package);
    });
  };
};

info.prototype.getHistory = function(pkg){
  var self = this;
  request.get('http://api.npmjs.org/downloads/range/2000-01-01:' + dateFormat(new Date(), "yyyy-mm-dd") +"/" + pkg.name, function (err, foo, body) {
    var counts = 0;
    body = JSON.parse(body);

    for(var key in body.downloads){
      counts += body.downloads[key].downloads;
    }
    pkg.npmDownloads = counts;
    pkg.stats = body;
    self.trigger("done", pkg);
  });
}

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

require("biojs-events").mixin(info.prototype);
module.exports = info;
