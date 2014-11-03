var fs = require('fs');
var GitHubApi = require("github");
var deepcopy = require('deepcopy');
var q = require('rsvp');
var _ = require("underscore");

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

      // request info
      this.queryBasic(ps,pkg,name);
      this.querySnippets(ps,pkg,name);

      // extended info
      this.queryEvents(ps,pkg,name);
      this.queryStats(ps,pkg,name);

    } else{
      self.info.trigger("done", pkg, "no github repo");
    }

    // wait until all requests have arrived
    q.all(ps).then(function(){
      self.info.trigger("done", pkg)
    }).catch(function(reason){
      console.error(reason);
      self.info.trigger("done", pkg, "error:" + reason);
    });
  }.bind(this);

  if(this.authenticate()){
    this.info.on("single", this.query);
  };
}

ghClient.prototype.queryBasic = function(ps,pkg,name){
  ps.push(new q.Promise(function(resolve,reject){
    repos.get(name, function(err,data){
      if(data != undefined){
        data.raw_url = rawURL(data);
      }
      pkg.github = data;
      resolve(pkg);
    });
  }));
};

// list a snippet folder
ghClient.prototype.querySnippets = function(ps,pkg,name){

  if( pkg.latest.sniper == undefined ){
    return;
  }

  // default folder
  if(pkg.latest.sniper.snippets == undefined){
    pkg.latest.sniper.snippets = ["snippets"];
  }

  for( var index in pkg.latest.sniper.snippets){
    var repoPath = deepcopy(name);
    repoPath.path =  "/" + pkg.latest.sniper.snippets[index];

    console.log("snippets: getting repoPath", repoPath);
    // snippet folder list
    ps.push(new q.Promise(function(resolve,reject){
      repos.getContent(repoPath, function(err,data){
        if(err != undefined || data == undefined){
          console.log(err); resolve(pkg);
          return;
        }
        // github adds meta info with remaining request
        if("meta" in data && data.meta !== undefined)
          delete data.meta;
        pkg.latest.sniper.srcs = filterSnipData(data);
        resolve(pkg);
      });
    }));
  }
}

// requests the event.json (index of all available events)
ghClient.prototype.queryEvents = function(ps,pkg,name){
  var repoPath = deepcopy(name);
  repoPath.path =  "/events.json";
  ps.push(new q.Promise(function(resolve,reject){
    repos.getContent(repoPath, function(err,data){
      if(err != undefined || data == undefined){
        resolve(pkg);
        return;
      }
      var content = new Buffer(data.content, 'base64').toString("utf-8");
      try{
        pkg.events = JSON.parse(content);
      }catch(err){
        console.log("event string parsing error", err);
      }
      resolve(pkg);
    });
  }));
}

ghClient.prototype.queryStats = function(ps,pkg,name){
  ps.push(new q.Promise(function(resolve,reject){
    repos.getContributors(name, function(err,data){
      if(err != undefined || data == undefined){
        resolve(pkg);
        return;
      }
      data = _.map(data,function(el){
        return {login: el.login, avatar_url: el.avatar_url, contributions: el.contributions};
      },0);
      // github adds meta info with remaining request
      var commits =_.reduce(data,function(memo,el){
        return memo + el.contributions;
      },0);
      pkg.github.stats = data;
      pkg.github.contributors = data.length;
      pkg.github.commits = commits;
      resolve(pkg);
    });
  }));
}

// groups snippets under the same name with a dictionary of their extensions
// a.html
// a.js
// b.js
// ->
// a: 
//    {html: , js: }
// b: 
//    {js: }
var filterSnipData = function(data){
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

// github api limits after 50 requests -> use creds to login
ghClient.prototype.authenticate = function(){
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

// return githubusercontent url to the root folder
function rawURL(ghub){
  return "https://raw.githubusercontent.com/" + ghub.full_name + "/" + ghub.default_branch + "/";
}

module.exports = ghClient;
