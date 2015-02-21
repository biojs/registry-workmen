/*global db  */
module.change_code = 1; // this allows hotswapping of code (ignored in production)
var queries = {};
var _ = require("underscore");
var moment = require("moment");

queries.all = function all(req, res) {
  db.db().find().exec(function(err, pkgs) {
    // &short=1 gives only the abstract of every pkg
    if (req.query.short !== undefined) {
      var pkgsSum = pkgs.map(function(pkg) {
        return limitPackage(pkg, defaultProps);
      });
      res.jsonp(pkgsSum);
    } else {
      res.jsonp(pkgs);
    }
  });
};

queries.stat = function stat(req, res) {
  db.db().find().exec(function(err, pkgs) {
    var stat = {};
    stat.count = pkgs.length;
    res.jsonp(stat);
  });
};

queries.detail = function detail(req, res) {
  var name = req.params.name;
  db.db().find({
    name: name
  }).exec(function(err, pkgs) {
    if (pkgs.length === 0) {
      res.send({
        error: "does not exist"
      });
      return;
    }
    var pkg = pkgs[0];
    res.jsonp(pkg);
  });
};

queries.logs = function logs(req, res) {
  var options = {
    from: req.query.from || new Date() - 24 * 60 * 60 * 1000,
    until: req.query.until || new Date(),
    limit: req.query.limit || 200,
    start: req.query.start || 0,
    order: req.query.order || 'desc',
    fields: ['message', 'level', 'timestamp' ]
  };
  //log.stream({ start: -1 }).on('log', function(log) {
  //res.write(log.message);
  //res.write("\n");
  //});
  //return;
  log.query(options, function(err, results) {
    if(err){
      log.warn(err);
      res.status(500).send(err);
    }
    results = results.mongodb;
    res.set({
      'Content-Type': 'text/plain',
      'Cache-Control': 'private, no-cache, no-store, must-revalidat',
      'Expires': '-1'
    });
    var msgs = results.map(function(r) {
      return moment(r.timestamp).format() + " - " +  r.level + ": " + r.message;
    }).join("\n");
    res.send(msgs);
  });
};

queries.search = function search(req, res) {
  var limit = req.query.limit || 5;
  var orderBy = req.query.orderby || "name";
  var orderDict = {};
  var orderDirection = 1;
  if (req.query.reversesort) orderDirection = -1;
  orderDict[orderBy] = orderDirection;

  var props = ['created', 'description', 'releases', 'version', 'license', 'name', 'modified',
    'npmDownloads', 'npmDownloadsLastWeek', 'keywords', 'stars', 'homepage', 'author', 'repository', 'contributors'
  ];
  db.db().find().sort(orderDict).limit(limit).exec(function(err, pkgs) {
    var pkgsSum = pkgs.map(function(pkg) {
      return limitPackage(pkg, props);
    });
    res.jsonp(pkgsSum);
  });
};

// attributes to keep in the short version
var defaultProps = ['created', 'description', 'dependencies', 'devDependencies',
  'dist-tags', 'releases', 'version', 'versions', 'license', 'name', 'modified', 'npmDownloadsLastWeek',
  'npmDownloads', 'keywords', 'stars', 'homepage', 'author', 'repository', 'contributors', 'iotags'
];

function limitPackage(pkg, props) {
  var pi = _.pick(pkg, props || defaultProps);
  pi.latest = {};
  pi.latest.sniper = pkg.latest.sniper;
  pi.latest.biojs = pkg.latest.biojs;
  // TODO: remove unnecessary stuff
  pi.github = _.pick(pkg.github, ['stargazers_count', 'owner', 'raw_url',
    'subscribers_count', 'forks_count', 'open_issues_count', 'contributors',
    'default_branch', 'full_name', 'commits'
  ]);
  pi.github.owner = _.pick(pi.github.owner, ['avatar_url', 'html_url']);
  return pi;
}

var log;
module.exports = function(logger) {
  log = logger;
  return queries;
};
