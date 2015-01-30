var fs = require('fs');
var GitHubApi = require("github");
var deepcopy = require('deepcopy');
var q = require('bluebird');
var _ = require("underscore");

var github = new GitHubApi({
  version: "3.0.0",
  debug: false
});
var repos = github.repos;
var gUtil = require("./util/github");


var ghClient = function(pkg) {
  var self = this;

  // queries the github repo
  // @see https://github.com/mikedeboer/node-github/blob/master/api/v3.0.0/repos.js#L263
  // name: "biojs-vis-msa"
  // obj the github file should be added
  if (this.authenticate()) {


    if (pkg.repository !== undefined && pkg.repository.type === "git") {
      var name = gUtil.parsePackage(pkg);
      pkg.repository.github = name;

      // check first whether the repo exists
      return this.queryBasic(pkg, name).then(function() {

        var ps = [];
        ps.push(self.querySnippets(pkg, name));

        // extended info
        ps.push(self.queryEvents(pkg,name));
        ps.push(self.queryStats(pkg, name));

        // wait until all requests have arrived
        return q.all(ps).then(function() {
          return pkg;
        });
      });

    } else {
      return new q.reject(pkg.name + ":no github repo found");
    }

  }
};

ghClient.prototype.queryBasic = function(pkg, name) {
  return new q.Promise(function(resolve, reject) {
    repos.get(name, function(err, data) {
      if (err != undefined || data == undefined) {
        reject({
          err: err,
          package: pkg.name,
          url: name,
          name: "queryBasic"
        });
        return;
      }

      if (data !== undefined) {
        data.raw_url = gUtil.rawURL(data);
      }
      pkg.github = data;
      resolve(pkg);
    });
  });
};

// list a snippet folder
ghClient.prototype.querySnippets = function(pkg, name) {

  var self = this;

  if (pkg.latest == undefined || pkg.latest.sniper === undefined) {
    return;
  }

  // default folder
  // TODO: change the default folder to examples
  if (pkg.latest.sniper.snippets == undefined) {
    pkg.latest.sniper.snippets = ["snippets"];
  }
  var ps = [];

  for (var index in pkg.latest.sniper.snippets) {
    var repoPath = deepcopy(name);
    repoPath.path = "/" + pkg.latest.sniper.snippets[index];

    console.log(pkg.name + ":snippets:", repoPath.user + repoPath.path);
    // snippet folder list
    ps.push(new q.Promise(function(resolve, reject) {
      repos.getContent(repoPath, function(err, data) {
        // err is null
        if (err != undefined || data == undefined) {
          console.log("error in querySnips", repoPath, err);
          reject({
            name: "querySnippets",
            err: err
          });
          return;
        }

        // github adds meta info with remaining request
        if ("meta" in data && data.meta !== undefined)
          delete data.meta;

        pkg.latest.sniper.srcs = filterSnipData(data);
        self.searchForJSON(pkg, name, data).then(function() {
          resolve(pkg);
        });
      });
    }));
  }
  return q.all(ps);
};

ghClient.prototype.searchForJSON = function(pkg, name, data) {
  var self = this;
  var ps = [];
  data.forEach(function(path) {
    if (endsWith(path.name, ".json")) {
      console.log(pkg.name + " has extra config: ... downloading");
      ps.push(self.querySnippetJSON(pkg, name, path.path));
    }
  });
  return q.all(ps);
};

// requests the snippets/<snippet-name>.json (if available)
ghClient.prototype.querySnippetJSON = function(pkg, name, path) {
  var repoPath = deepcopy(name);
  repoPath.path = path;
  // TODO: use a nice regex
  var snipName = path.split("/").slice(-1)[0].split(".")[0];

  pkg.latest.sniper.extra = {};
  return new q.Promise(function(resolve, reject) {
    repos.getContent(repoPath, function(err, data) {
      if (err != undefined || data === undefined) {
        reject({
          name: "querySnippetJSON",
          err: err
        });
        return;
      }
      console.log(pkg.name + " has extra config: " + snipName);
      var content = new Buffer(data.content, 'base64').toString("utf-8");
      try {
        pkg.latest.sniper.extra[snipName] = JSON.parse(content);
      } catch (err) {
        console.log(" string parsing error", err);
      }
      resolve(pkg);
    });
  });
};



// requests the event.json (index of all available events)
ghClient.prototype.queryEvents = function(pkg, name) {
  var repoPath = deepcopy(name);
  repoPath.path = "/events.json";
  return new q.Promise(function(resolve, reject) {
    repos.getContent(repoPath, function(err, data) {
      if (err !== undefined || data === undefined) {
        //reject({name: "queryEvents", err: err});
        // if we reject on errors, all other promises will be skipped
        resolve(pkg);
        return;
      }
      var content = new Buffer(data.content, 'base64').toString("utf-8");
      try {
        pkg.events = JSON.parse(content);
      } catch (err) {
        console.log(pkg.name + ": event string parsing error", err);
      }
      resolve(pkg);
    });
  });
}

ghClient.prototype.queryStats = function(pkg, name) {
  return new q.Promise(function(resolve, reject) {
    repos.getContributors(name, function(err, data) {
      if (err != undefined || data == undefined) {
        return reject({
          pkg: name,
          name: "queryStats",
          err: err
        });
      }
      data = _.map(data, function(el) {
        return {
          login: el.login,
          avatar_url: el.avatar_url,
          contributions: el.contributions
        };
      }, 0);
      // github adds meta info with remaining request
      var commits = _.reduce(data, function(memo, el) {
        return memo + el.contributions;
      }, 0);
      pkg.github.contribs = data;
      pkg.github.commits = commits;
      resolve(pkg);
    });
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
var filterSnipData = function(data) {
  var dic = {};

  for (var key in data) {

    // folder can't be snippets
    if (data[key].type === "dir") {
      continue;
    }

    var name = data[key]["name"].split(".")[0];
    var ext = data[key]["name"].split(".")[1];
    if (dic[name] == undefined) {
      dic[name] = {};
    }
    dic[name][ext] = data[key];
  }
  return dic;
};

// github api limits after 50 requests -> use creds to login
ghClient.prototype.authenticate = function() {
  // TODO: make this more generic for heroku
  var creds;
  if (process.env.TEST_MODE) {
    return true;
  }
  try {
    if (process.env.GITHUB_TOKEN !== undefined) {
      creds = {
        type: "oauth",
        token: process.env.GITHUB_TOKEN
      };
    } else {
      creds = require("../creds.json");
    }
  } catch (e) {
    console.error("No Github creds provided");
    return false;
  }
  github.authenticate(creds);
  return true;
};

function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

module.exports = ghClient;
