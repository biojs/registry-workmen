var queries = {};
var _ = require("underscore");

queries.all = function all(req, res){
  // attributes to keep in the short version
  var props = ['created', 'description', 'dependencies', 'devDependencies',
    'dist-tags', 'releases', 'version', 'versions', 'license', 'name', 'modified',
    'npmDownloads', 'keywords', 'stars', 'homepage','author', 'repository', 'contributors'];

    db.db().find().exec(function (err, pkgs) {
      // &short=1 gives only the abstract of every pkg
      if(req.query.short !== undefined){
        var pkgsSum = pkgs.map(function(el){
          var pi = _.pick(el,props);
          pi.latest = {};
          pi.latest.sniper = el.latest.sniper;
          pi.latest.biojs = el.latest.biojs;
          pi.github = {};
          // TODO: remove unnecessary stuff
          pi.github = _.pick(el.github, ['stargazers_count', 'owner', 'raw_url', 'subscribers_count', 'forks_count', 'open_issues_count', 'contributors', 'default_branch', 'full_name']);
          pi.github.owner = _.pick(pi.github.owner, ['avatar_url', 'html_url']);
          return pi;
        });
        res.jsonp(pkgsSum);
      }else{
        res.jsonp(pkgs);
      };
    });
};


queries.stat = function stat(req, res){
    db.db().find().exec(function (err, pkgs) {
        var stat = {};
        stat.count = pkgs.length;
        res.jsonp(stat);
    });
};

queries.detail = function detail(req, res){
  var name = req.params.name;
  db.db().find({name: name}).exec(function (err, pkgs) {
    if( pkgs.length == 0){
      res.send({error: "does not exist"});
      return;
    }
    var pkg = pkgs[0];
    res.jsonp(pkg);
  });
};

module.exports = queries;
