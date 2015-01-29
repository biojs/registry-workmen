var q = require('bluebird');
var registry = require("npm-registry");
var _ = require('underscore');

var database = require("./lib/database.js");

// crawlers
var keywords = require("npm-keywords");
var ghClient = require("./lib/github.js");
var npmClient = require("./lib/npm.js");
var npmHistory = require("./lib/npmHistory.js");

// helpers
var postProcessor = require("./lib/util/postProcessor.js");

var workflow = function(opts) {
  this.keys = opts.keys || [];
  this.refreshTime = opts.refreshTime || 3600;
  this.searchTime = opts.searchTime || 120;
  this.updateInterval = opts.updateInterval || 60;
  this.db = new database();
  this.dbLoad = this.db.load();
  this.pkgs = [];
  this.npm = new registry({
    registry: opts.registryURL
  });
};

workflow.prototype.start = function() {
  return this.run().then(function() {
    this.reloadCron = setInterval(this.run.bind(this), this.refreshTime * 1000);
    this.searchCron = setInterval(this.searchCron.bind(this), this.searchTime * 1000);
    this.updateCron = setInterval(this.updateCronJob.bind(this), this.updateInterval * 1000);
    return this.pkgs;
  }.bind(this));
};

// 1) download package list
workflow.prototype.run = function run() {
  var self = this;
  return keywords(this.keys, this.npm).map(this.downloadPkg.bind(this)).then(function(pkgs) {
    // on succes:  save to DB 
    console.log("workflow: trying to save into DB.");
    self.pkgs = pkgs.map(function(el) {
      return {
        name: el.name,
        version: el.version
      };
    });
    self.dbLoad
      .then(self.db.loadCache.bind(self.db))
      .then(function() {
        return self.db.save(pkgs);
      });
  }).then(function() {
    console.log("workflow: load complete.");
    return self.pkgs;
  });
};

// 2) crawl the package from NPM
workflow.prototype.downloadPkg = function(name) {
  // also support pkg object with name attribute
  if (name.name !== undefined) {
    name = name.name;
  }
  return new npmClient(name, this.npm).then(this.postDownload.bind(this));
};

// 3) other info
workflow.prototype.postDownload = function(pkg) {
  var postOpts = {
    keys: this.keys
  };
  var ps = [];
  ps.push(new ghClient(pkg));
  ps.push(new npmHistory(pkg));
  return q.all(ps).then(function() {
    return postProcessor(pkg, postOpts);
  }).catch(function(err) {
    if (err != undefined && err.name !== "queryEvents") {
      // event errors can happen - ignore them
      console.log("downloaderr", err);
    } else {
      console.log(arguments);
    }
    return pkg;
  });
};

// update a single pkg
workflow.prototype.updatePkg = function(pkg) {
  return this.downloadPkg(pkg).then(function(newPkg) {
    var index = _.indexOf(_.pluck(this.pkgs, "name"), newPkg.name);
    this.pkgs[index] = newPkg;
    this.db.updatePkg(newPkg);
    console.log("package update saved: ", newPkg.name);
  }.bind(this)).catch(function(err) {
    console.log("err during package update: ", pkg.name);
    console.log(err);
  });
};

// crons the npm registry manually and checks for package updates
workflow.prototype.updateCronJob = function updateCronJob() {
  var self = this;
  this.pkgs.forEach(function(oldPkg) {
    return new npmClient(oldPkg.name + "@latest", self.npm).then(function(newPkg) {
      // we have only the latest version -> download entire package
      if (oldPkg.version != newPkg.version && newPkg.name != undefined) {
        console.log("new package uploaded: ", newPkg.name, newPkg.version, oldPkg.version);
        self.updatePkg(newPkg.name);
      }
    }.bind(this));
  });
};

// crons the npm registry for new packages
workflow.prototype.searchCron = function searchCron() {
  var self = this;
  var pkgNames = this.pkgs.map(function(pkg) {
    return pkg.name;
  });
  return keywords(this.keys, this.npm).filter(function(pkg) {
    console.log(pkg.name);
    return pkgNames.indexOf(pkg.name) < 0;
  }).then(function(pkgs) {
    console.log(pkgs);
    if (pkgs.length > 0) {
      pkgs.forEach(function(pkg) {
        console.log("new package found: ", pkg.name);
        self.updatePkg(pkg.name);
      });
    }
  });
};

workflow.prototype.stop = function() {
  clearInterval(this.updateCron);
  clearInterval(this.reloadCron);
  clearInterval(this.searchCron);
};

module.exports = workflow;
