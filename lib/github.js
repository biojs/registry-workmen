var GitHubApi = require("github");
var github = new GitHubApi( {
  version: "3.0.0",
  debug: true});
var repos = github.repos;

var fs = require('fs');
var creds = require("../creds.json");
github.authenticate(creds);


var ghClient = {};


// queries the github repo
// @see https://github.com/mikedeboer/node-github/blob/master/api/v3.0.0/repos.js#L263
// name: "biojs-vis-msa"
// obj the github file should be added
ghClient.query = function(name, pkg, callback) { 
  repos.get(name, function(err,data){
    pkg.github = data;
    callback();
  });
};

ghClient.queryAll = function(pkgs, callback) { 
  var finalPkgs = pkgs.length;
  var counter = 0;
  var counting = function(){
    counter++;
    if(counter == finalPkgs){
        callback();
    }
  }
  for(var i in pkgs){
    var pkg = pkgs[i];
    if(pkg.repository !== undefined && pkg.repository.type === "git"){
      // TODO: ugly way to split the git url string
     var url = pkg.repository.url.split("/");
     var name = {user: url[url.length - 2], repo: url[url.length - 1]};
     ghClient.query(name,pkg,counting); 
    }else{
      finalPkgs--;
    }
  }
  if(finalPkgs == 0){
    console.log("warning: no github packages");
    callback();
  }
};

module.exports = ghClient;
