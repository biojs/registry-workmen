module.change_code = 1; // this allows hotswapping of code (ignored in production)

var swig = require("swig");
var request = require("request");
var loadSnippet = require("./snippets/demo.js");
var snipResponse = require("./snippets/response.js");
var join = require("path").join;
var errors = require("./errors");

var snip = {};

snip.demo = function(req, res) {
  var name = req.params.name;
  var currentSnip = req.params.snip;
  var additionalPath = req.params[0];
  var hasExtension = currentSnip.indexOf(".") >= 0 || additionalPath !== undefined;

  global.db.db().find({
    name: name
  }).exec(function(err, pkgs) {
    if (pkgs.length === 0 || pkgs[0].latest.sniper === undefined) {
      res.send({
        error: "no snips"
      });
      return;
    }
    var pkg = pkgs[0];
    // if there is a file extension - we probably want to load it from github
    // TODO: distinguish between multiple folders
    if (hasExtension) {
      if (pkg.repository !== undefined && pkg.repository.github !== undefined) {
        // TOOD: use default github branch
        var snippetPath = currentSnip;
        if (additionalPath !== undefined) {
          snippetPath = join(currentSnip, additionalPath);
        }
        serveGithubFile(pkg.repository.github, join("master", pkg.latest.sniper.snippets[0], snippetPath), res);
      } else {
        errors.unknownSnippetFile({
          pkg: pkg,
          currentSnip: currentSnip,
          req: req,
          res: res
        });
        return;
      }
    } else {
      loadSnippet({
        pkg: pkg,
        currentSnip: currentSnip,
        res: res
      }, function(item) {
        snipResponse._demoFill(res, item, pkg);
      });
    }
  });
};

// https://github.com/jsbin/jsbin/blob/v1.0.0/index.php#L77
snip.jsbin = function(req, res) {
  snip.edit(req, res, function(snip) {
    var js = snip.inlineScript;
    var body = swig.renderFile(__dirname + "/../templates/header.html", {
      scripts: snip.js,
      css: snip.css
    });
    body += "\n" + snip.inlineBody;
    res.render("jsbin", {
      html: body,
      js: js,
      redirectURL: "http://jsbin.com?js,output"
    });
  });
}

// http://blog.codepen.io/documentation/api/prefill/
snip.codepen = function(req, res) {
  snip.edit(req, res, function(snip) {
    var js = snip.inlineScript;
    var body = swig.renderFile(__dirname + "/../templates/header.html", {
      scripts: snip.js,
      css: snip.css
    });
    body += "\n" + snip.inlineBody;
    var obj = {
      js: js,
      html: body
    };
    obj = JSON.stringify(obj);
    obj = obj.replace(/"/g, '\"'); // unscrew quotes
    res.render("codepen", {
      obj: obj,
      redirectURL: "http://codepen.io/pen/define"
    });
  });
}

snip.edit = function(req, res, callback) {
  var name = req.params.name;
  var currentSnip = req.params.snip;
  global.db.db().find({
    name: name
  }).exec(function(err, pkg) {
    if (pkg.length == 0 || pkg[0].latest.sniper == undefined) {
      res.send({
        error: "no snips"
      });
      return;
    }
    loadSnippet({
      pkg: pkg[0],
      currentSnip: currentSnip,
      res: res
    }, function(snip) {
      var githubRegex = /\/github\//g;
      for (var i in snip.js) {
        snip.js[i] = snip.js[i].replace(githubRegex, global.ghProxy);
      }
      for (var i in snip.css) {
        snip.css[i] = snip.css[i].replace(githubRegex, global.ghProxy);
      }
      snip.inlineScript = snip.inlineScript.replace(githubRegex, global.ghProxy);
      snip.inlineBody = snip.inlineBody.replace(githubRegex, global.ghProxy);
      callback(snip);
    });
  });
}

// list available snips
snip.overview = function(req, res) {
  var name = req.params.name;
  var currentSnip = req.params.snip;
  global.db.db().find({
    name: name
  }).exec(function(err, pkg) {
    if (pkg.length == 0 || pkg[0].latest.sniper == undefined) {
      errors.noSnippets({
        pkg: pkg,
        currentSnip: currentSnip,
        req: req,
        res: res
      });
      return;
    }
    var pkg = pkg[0];
    var baseURL = req.protocol + '://' + req.get('host') + req.originalUrl;
    // remove path at the end
    if (baseURL.charAt(baseURL.length - 1) !== "/") {
      baseURL += "/";
    }
    if (pkg.latest.sniper.srcs === undefined) {
      errors.unknownSnippetFile({
        pkg: pkg,
        currentSnip: currentSnip,
        req: req,
        res: res
      });
      return;
    }
    var snips = Object.keys(pkg.latest.sniper.srcs);
    res.render("list", {
      snips: snips,
      baseHref: baseURL
    });
  });
};

// simple github proxy
snip.github = function(req, res) {
  serveGithubFile({
    user: req.params.name,
    repo: req.params.repo
  }, req.params[0], res);
};

function serveGithubFile(pkg, path, res) {
  // TODO: minify gzip
  // TODO: cache locally
  console.log("serving github file", pkg, path);
  var url = "https://raw.githubusercontent.com/" + pkg.user + "/" + pkg.repo + "/" + path;
  request.get(url, function(err, response, body) {
    res.send(body);
  });
}

module.exports = snip;
