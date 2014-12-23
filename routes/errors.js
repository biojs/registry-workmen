var errors;
module.exports = errors = {};
var swig = require("swig");

errors.noSnippets = function(opts) {
  var msg = "e1: The workmen couldn't find any example snippets on github";
  var errors = [];
  errors.push.apply(errors, githubErrors());
  errors.push("Examples not published on github");
  errorHelper(opts, {
    errors: errors,
    msg: msg
  });
};

errors.unknownSnippetFile = function(opts) {
  var msg = "e2: The workmen couldn't find your requesting file";
  var errors = [];
  errors.push.apply(errors, githubErrors());
  errors.push("Examples not published on github");
  errorHelper(opts, {
    errors: errors,
    msg: msg
  });
};

errors.noGithub = function(opts) {
  var msg = "e3: The workmen couldn't find a github repository";
  var errors = [];
  errors.push.apply(errors, githubErrors());
  errorHelper(opts, {
    errors: errors,
    msg: msg
  });
};

errors.noSnippet = function(opts) {
  var msg = "e4: The workmen couldn't find the js file for your snippet";
  var errors = [];
  errors.push.apply(errors, githubErrors());
  errors.push("Examples not published on github");
  errorHelper(opts, {
    errors: errors,
    msg: msg
  });
};

function githubErrors() {
  var errors = [];
  errors.push("Wrong repository in your package.json");
  errors.push("Wrong examples directory in your sniper config");
  return errors;
}

function errorHelper(opts, vars) {
  var res = opts.res;

  var detail = vars.detail = {};
  if (opts.currentSnip !== undefined) {
    detail.currentSnip = JSON.stringify(opts.currentSnip);
  }
  detail.pkg = JSON.stringify(opts.pkg, null, "  ");
  var text = swig.renderFile(__dirname + "/../templates/error.html", vars);
  res.status(500);
  res.send(text);
}
