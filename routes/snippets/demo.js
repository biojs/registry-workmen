module.change_code = 1; // this allows hotswapping of code (ignored in production)

var request = require("request");
var q = require('bluebird');
var browerifyCDN = "http://wzrd.in/bundle/";
var _ = require("underscore");
var errors = require("../errors.js");

module.exports = function(obj, callback) {
  var currentSnip = obj.currentSnip;
  var res = obj.res;
  var pkg = obj.pkg;
  var snip = pkg.latest.sniper;
  // dirty hack to avoid browserify for apinatomy
  var noBrowserify = snip.noBrowserify || pkg.name === "apinatomy-core";

  if (pkg.github === undefined || snip.srcs === undefined) {
    errors.noGithub({
      pkg: pkg,
      currentSnip: currentSnip,
      res: res
    });
    return;
  }

  // snip has extra config
  if (snip.extra !== undefined && snip.extra[currentSnip] !== undefined) {
    // merge extra config
    for (var key in snip.extra[currentSnip]) {
      snip[key] = _.uniq(_.union(snip[key], snip.extra[currentSnip][key]));
    }
  }

  // load browserified version
  if (!noBrowserify) {
    snip.js.push(browerifyCDN + pkg.name + "@" + pkg.version);
  }

  // expose other bundles
  if (snip.exposed !== undefined) {
    for (var i = 0; i < snip.exposed.length; i++) {
      snip.js.push(browerifyCDN + snip.exposed[i] + "@latest");
    }
  }

  var baseLocal = convertGithubToRaw("/github/" + pkg.github.full_name + "/" + pkg.github.default_branch);

  // css
  // the user might specify alternative css locations
  if (snip.buildCSS !== undefined) {
    snip.css = snip.buildCSS;
  }

  function translateURL(obj, base) {
    // fix CDN urls
    if (obj.substring(0, 2) === "//") {
      return "https:" + obj;
    }

    // translate root urls to github
    if (obj.charAt(0) === "/") {
      return base + obj;
    }
    return obj;
  }

  // translate all absolute URLs to github
  for (var i in snip.css) {
    snip.css[i] = translateURL(snip.css[i], baseLocal);
  }

  // remove the build js (generated by browserify)
  var index = 0;
  while (index < snip.js.length) {
    if (snip.js[index].substring(0, 7) === "/build/") {
      snip.js.splice(index, 1);
    } else {
      snip.js[index] = translateURL(snip.js[index], baseLocal);
      index++;
    }
  }

  // download snippets on-the-fly
  var ps = [];
  if (snip.srcs[currentSnip] === undefined) {
    errors.noSnippet({
      pkg: pkg,
      currentSnip: currentSnip,
      res: res
    });
    return;
  }

  // js
  snip.inlineScript = "";

  // TODO: dirty hack to get apinatomy working
  if (noBrowserify) {
    snip.srcs[currentSnip].js = undefined;
  }

  if (snip.srcs[currentSnip].js === undefined) {
    errors.noSnippet({
      pkg: pkg,
      currentSnip: currentSnip,
      res: res
    });
    return;
  } else {
    var jsURL = convertGithubToRaw(snip.srcs[currentSnip].js.html_url);
    ps.push(new q.Promise(function(resolve, reject) {
      request.get(jsURL, function(err, response, body) {

        snip.inlineScript = "";
        body = translateRelative(body, baseLocal, snip.snippets[0]);

        // inject yourDiv
        if (snip.hasNoHTML) {
          snip.inlineScript = "var yourDiv = document.getElementById('yourDiv');\n";
        }

        snip.inlineScript += body;
        resolve();
      });
    }));
  }

  // html
  snip.inlineBody = "";
  if (snip.srcs[currentSnip].html !== undefined) {
    var htmlURL = convertGithubToRaw(snip.srcs[currentSnip].html.html_url);
    ps.push(new q.Promise(function(resolve) {
      request.get(htmlURL, function(err, response, body) {
        body = translateRelative(body, baseLocal, snip.snippets[0]);
        snip.inlineBody = body;
        resolve();
      });
    }));
  } else {
    snip.inlineBody = "<div id=yourDiv></div>";
    snip.hasNoHTML = true;
  }

  q.all(ps).then(function() {
    callback(snip);
  });
};

// TODO: apply dirty hacks on the snippets
// problem: access files from the snipper
function translateRelative(body, baseLocal, path) {
  if (body.indexOf("./") >= 0) {
    //var rawURL = "https://cors-anywhere.herokuapp.com/" + pkg.github.raw_url;
    var htmlUrl = baseLocal + "/" + path + "/";
    body = body.replace(/\.\.\//g, baseLocal + "/");
    body = body.replace(/\.\//g, htmlUrl);
  }
  return body;
}

function convertGithubToRaw(contentURL) {
  contentURL = contentURL.replace("github.com", "raw.githubusercontent.com");
  contentURL = contentURL.replace("blob/", "");
  return contentURL;
}
