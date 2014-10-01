var express = require('express');
var compress = require('compression');
var swig = require("swig");
var loadSnippet = require("./snippet");

// cfg
var port = process.env.PORT || process.argv[2] || 3000;
var refreshTime = process.env.REFRESH_TIME || 3600 * 60; // in ms

// set swig in express
var app = express();
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/templates');
app.use(compress());

//CORS middleware
var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}
app.use(allowCrossDomain);

// custom powered by
app.disable('x-powered-by', 'BioJS');
app.use(function (req, res, next) {
  res.setHeader("X-Powered-By", "BioJS");
  next();
});

// cache the json on the client
app.use(function (req, res, next) {
  res.setHeader("Cache-Control", "public,max-age=3600"); // 60m (in s)
  res.setHeader("Expires", new Date(Date.now() + 3600 * 1000).toUTCString()); // 1h (in ms)
  next();
});

// response time
  var responseTime = require('response-time')
app.use(responseTime())

  // routes
  app.get('/', mainpage);
  app.get('/all', all);
  app.get('/detail/:name', detail);
  app.get('/demo/:name/:snip', snip);
  app.get('/demo/:name', snipOverview);
  app.get('/jsbin/:name/:snip', snipJSBin);
  app.get('/codepen/:name/:snip', snipCodepen);

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

// https://github.com/jsbin/jsbin/blob/v1.0.0/index.php#L77
function snipJSBin(req,res){
  snipEdit(req,res, function(snip){
    var js = snip.inlineScript;
    var body = swig.renderFile(__dirname + "/templates/header.html", {
      scripts: snip.js, css: snip.css});
    body += "\n" +snip.inlineBody;
    res.render("jsbin", {html: body, js: js, redirectURL: "http://jsbin.com?js,output"});
  });
}

// http://blog.codepen.io/documentation/api/prefill/
function snipCodepen(req,res){
  snipEdit(req,res, function(snip){
    var js = snip.inlineScript;
    var body = swig.renderFile(__dirname + "/templates/header.html", {
      scripts: snip.js, css: snip.css});
    body += "\n" +snip.inlineBody;
    var obj = { js: js, html: body};
    obj =  JSON.stringify(obj); 
    obj = obj.replace(/"/g, '\"'); // unscrew quotes
    res.render("codepen", {obj: obj, redirectURL: "http://codepen.io/pen/define"});
  });
}

function snipEdit(req, res, callback){
  var name = req.params.name;
  var currentSnip = req.params.snip;
  db().find({name: name}).exec(function (err, pkg) {
    if(pkg.length == 0 || pkg[0].latest.sniper == undefined){
      res.send({error: "no snips"});
      return;
    }
    loadSnippet({pkg: pkg[0], currentSnip: currentSnip, res: res}, function (snip){
      callback(snip);
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
