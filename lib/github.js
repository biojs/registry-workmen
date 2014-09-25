var fs = require('fs');
var GitHubApi = require("github");
var deepcopy = require('deepcopy');

var github = new GitHubApi( {
  version: "3.0.0",
  debug: false});
var repos = github.repos;


var ghClient = function(info){
  var self = this;
  self.info = info;

  // queries the github repo
  // @see https://github.com/mikedeboer/node-github/blob/master/api/v3.0.0/repos.js#L263
  // name: "biojs-vis-msa"
  // obj the github file should be added
  this.query = function(pkg) { 

    var expected = 0;
    var received = 1; // auto-count the call of the function

    var finalTrigger = function(pkgC){
      if(expected == received){
        self.info.trigger("done", pkgC)
      }else{
        received++;
      }
    }

    //self.info.trigger("done", pkg);
    if(pkg.repository !== undefined && pkg.repository.type === "git"){
      // TODO: ugly way to split the git url string
      var url = pkg.repository.url.split("/");
      var name = {user: url[url.length - 2], repo: url[url.length - 1]};
      expected++;
      repos.get(name, function(err,data){
        pkg.github = data;
        finalTrigger(pkg);
      });

      if( pkg.latest.sniper != undefined ){

        console.log("snippets found");

        for( var index in pkg.latest.sniper.snippets){
          expected++;

          var repoPath = deepcopy(name);
          repoPath.path =  "/" + pkg.latest.sniper.snippets[index];

          console.log("getting repoPath", repoPath);
          repos.getContent(repoPath, function(err,data){
            if( data !== undefined){
              if("meta" in data && data.meta !== undefined){
                delete data.meta;
              }
              pkg.latest.sniper.srcs = filterSnipData(data);
              finalTrigger(pkg);
            }else{
              console.err("request failed", arguments);
            }
          });
        }
      }

    } else{
      self.info.trigger("done", pkg, "no github repo");
    }
  };

  // groups snippets under the same name with a dictionary of their extensions
  // a.html
  // a.js
  // b.js
  // ->
  // a: 
  //    {html: , js: }
  // b: 
  //    {js: }
  filterSnipData = function(data){
    var dic = {};
    for(var key in data){
      var name = data[key]["name"].split(".")[0];
      var ext = data[key]["name"].split(".")[1];
      if(dic[name] == undefined){
        dic[name] = {};
      }
      dic[name][ext] = data[key];
    }
    return dic;
  }

  this.authenticate = function(){
    // TODO: make this more generic for heroku
    try{
      if(process.env.GITHUB_TOKEN !== undefined){
        var creds = {type: "oauth", token: process.env.GITHUB_TOKEN};
      }else{
        var creds = require("../creds.json");
      }
    }catch(e) {
      console.error("No Github creds provided");
      return false;
    }
    github.authenticate(creds);
    return true;
  }

  if(this.authenticate()){
    this.info.on("single", this.query);
  };
}

module.exports = ghClient;
