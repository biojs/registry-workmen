var GitHubApi = require("github");
var github = new GitHubApi( {
  version: "3.0.0",
  debug: false});
var repos = github.repos;

var fs = require('fs');



var ghClient = function(info){
  var self = this;
  self.info = info;

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
        self.info.trigger("done", pkg);
      });
    } else{
      self.info.trigger("done", pkg, "no github repo");
    }
  };

  this.authenticate = function(){
    // TODO: make this more generic for heroku
    if(process.env.GITHUB_TOKEN !== undefined){
      var creds = {type: "oauth", token: process.env.GITHUB_TOKEN};
    }else{
      try{
        var creds = require("../creds.json");
      }catch(e) {
        console.error("No Github creds provided");
        return false;
      }
    }
    github.authenticate(creds);
    return true;
  }

  if(this.authenticate()){
    this.info.on("single", this.query);
  };
}

module.exports = ghClient;
