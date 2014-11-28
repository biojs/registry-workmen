var q = require('bluebird');
var registry = require("npm-registry");
var npm = new registry();

var database = require("./lib/database.js");

// crawlers
var keywords = require("npm-keywords");
var ghClient = require("./lib/github.js");
var npmClient = require("./lib/npm.js");
var npmHistory = require("./lib/npmHistory.js");

var db = new database();
var dbLoad = db.load();

var workflow = {};
workflow.db = db;
workflow.dbLoad = dbLoad;
workflow.keys = [];

workflow.run = function run(){
  // 1) download package list
  return keywords(workflow.keys,npm).map(function(pkg){
    // 2) crawl the package from NPM
    return new npmClient(pkg,workflow.keys,npm).then(function(pkg){
      // 3) other info
      var ps = [];
      ps.push(new ghClient(pkg));
      ps.push(new npmHistory(pkg));
      return q.all(ps).then(function(){
       return pkg; 
      }).catch(function(err){
        if(err.name != "queryEvents"){
          console.log(err) 
        }
        return pkg;
      });
    });
  }).then(function(pkgs){
    // 3) save to DB 
    console.log("workflow: trying to save into DB.");
    dbLoad
    .then(db.loadCache.bind(db))
    .then(function(){
      return db.save(pkgs);
    });
  }).then(function(){
    console.log("workflow: load complete.");
  });
}

module.exports = workflow;
