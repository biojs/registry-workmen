var GitHubApi = require("github");
var github = new GitHubApi( {
  version: "3.0.0",
  debug: false});
var repos = github.repos;

var fs = require('fs');

// TODO: make this more generic for heroku
var creds = require("../creds.json");
github.authenticate(creds);


var ghClient = function(trigger){
  var self = this;
  self.trigger = trigger;

  // queries the github repo
  // @see https://github.com/mikedeboer/node-github/blob/master/api/v3.0.0/repos.js#L263
  // name: "biojs-vis-msa"
  // obj the github file should be added
  this.query = function(pkg) { 

    //self.info.trigger("done", pkg);
    if(pkg.repository !== undefined && pkg.repository.type === "git"){
      // TODO: ugly way to split the git url string
      var url = pkg.repository.url.split("/");
      var name = {user: url[url.length - 2], repo: url[url.length - 1]};
      repos.get(name, function(err,data){
        pkg.github = data;
        trigger("done", pkg);
      });
    } else{
      self.trigger("done", pkg, "no github repo");
    }
  };

};

module.exports = ghClient;
