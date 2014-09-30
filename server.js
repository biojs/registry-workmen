var express = require('express');
var app = express();
var port = process.env.PORT || process.argv[2] || 3000;
var refreshTime = process.env.REFRESH_TIME || 3600 * 60; // in ms
var swig = require("swig");
var loadSnippet = require("./snippet");

// set swig in express
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/templates');

//CORS middleware
var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}
app.use(allowCrossDomain);

// routes
app.get('/', mainpage);
app.get('/all', all);
app.get('/detail/:name', detail);
app.get('/demo/:name/:snip', snip);
app.get('/demo/:name', snipOverview);
app.get('/jsbin/:name/:snip', snipJSBin);

var Datastore = require('nedb');

var workmen = require("./lib/workmen");
runWorker = function(){
  new workmen(function(pkg,dbNew){
    // worker finished - reload db
    console.log("reloading db");
    db = dbNew; 
  })
}
runWorker();
// TODO: make this dynamic
interval = setInterval(runWorker, refreshTime * 1000);

function mainpage(req, res){
  res.sendFile("./README.md", {root: __dirname});
};
// TODO: cleanup

function all(req, res){
  db().find().exec(function (err, pkgs) {
    console.log("len", pkgs.length);
    res.jsonp(pkgs);
  });
};

function detail(req, res){
  var name = req.params.name;
  db().find({name: name}).exec(function (err, pkgs) {
    if( pkgs.length == 0){
      res.send({error: "does not exist"});
      return;
    }
    var pkg = pkgs[0];
    res.jsonp(pkg);
  });
};


function snip(req, res){
  var name = req.params.name;
  var currentSnip = req.params.snip;
  db().find({name: name}).exec(function (err, pkg) {
    if(pkg.length == 0 || pkg[0].latest.sniper == undefined){
      res.send({error: "no snips"});
      return;
    }
    loadSnippet({pkg: pkg[0], currentSnip: currentSnip}, function (snip){
      res.render("single", {scripts: snip.js, css: snip.css, inlineScript: snip.inlineScript, inlineBody: snip.inlineBody});
    });
  });
};

function snipJSBin(req, res){
var name = req.params.name;
  var currentSnip = req.params.snip;
  db().find({name: name}).exec(function (err, pkg) {
    if(pkg.length == 0 || pkg[0].latest.sniper == undefined){
      res.send({error: "no snips"});
      return;
    }
    loadSnippet({pkg: pkg[0], currentSnip: currentSnip}, function (snip){
      var js = snip.inlineScript;
      var body = swig.renderFile(__dirname + "/templates/header.html", {
        scripts: snip.js, css: snip.css});

      body += "\n" +snip.inlineBody;
      res.render("jsbin", {html: body, js: js, redirectURL: "http://jsbin.com?js,output"});
      //res.render("single", {scripts: snip.js, css: snip.css, inlineScript: inlineScript, inlineBody: inlineBody});
    });
  });

}

// list available snips
function snipOverview(req, res){
  var name = req.params.name;
  var currentSnip = req.params.snip;
  db().find({name: name}).exec(function (err, pkg) {
    if(pkg.length == 0|| pkg[0].latest.sniper == undefined){
      res.send({error: "no snips"});
      return;
    }
    var pkg = pkg[0];
    var baseURL = req.protocol + '://' + req.get('host') + req.originalUrl;
    // remove path at the end
    if(baseURL.charAt(baseURL.length - 1) !== "/" ){
      baseURL += "/";
    }
    var snips = Object.keys(pkg.latest.sniper.srcs);
    res.render("list",{snips: snips, baseHref: baseURL}); 
  });
};

var server = app.listen(port, function() {
  console.log('Listening on port %d', server.address().port);
});
