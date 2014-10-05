var fs = require('fs');
var GitHubApi = require("github");
var deepcopy = require('deepcopy');
var q = require('rsvp');

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

    var ps = [];

    if(pkg.repository !== undefined && pkg.repository.type === "git"){
      // TODO: ugly way to split the git url string
      var url = pkg.repository.url.split("/");
      var name = {user: url[url.length - 2], repo: url[url.length - 1]};

      ps.push(new q.Promise(function(resolve,reject){
        repos.get(name, function(err,data){
          if(data != undefined){
            data.raw_url = rawURL(data);
          }
          pkg.github = data;
          resolve(pkg);
        });
      }));

      if( pkg.latest.sniper != undefined ){

        for( var index in pkg.latest.sniper.snippets){

          var repoPath = deepcopy(name);
          repoPath.path =  "/" + pkg.latest.sniper.snippets[index];

          console.log("snippets: getting repoPath", repoPath);

          ps.push(new q.Promise(function(resolve,reject){
            repos.getContent(repoPath, function(err,data){
              if(err != undefined || data == undefined){
                console.log(err); resolve(pkg);
                return;
              }

              if("meta" in data && data.meta !== undefined){
                delete data.meta;
              }
              pkg.latest.sniper.srcs = filterSnipData(data);
              resolve(pkg);
            });
          }));
        }
      }

    } else{
      self.info.trigger("done", pkg, "no github repo");
    }


    q.all(ps).then(function(){
      self.info.trigger("done", pkg)
    }).catch(function(reason){
      console.error(reason);
      self.info.trigger("done", pkg, "error:" + reason);
    });
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

      // folder can't be snippets
      if(data[key].type == "dir"){
        continue; 
      }

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

function rawURL(ghub){
  return "https://raw.githubusercontent.com/" + ghub.full_name + "/" + ghub.default_branch + "/";
}

module.exports = ghClient;
