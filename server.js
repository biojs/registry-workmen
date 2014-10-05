var express = require('express');
var compress = require('compression');
var swig = require("swig");
var snip = require("./snippetHandler");

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
  app.get('/demo/:name/:snip', snip.demo);
  app.get('/demo/:name', snip.overview);
  app.get('/jsbin/:name/:snip', snip.jsbin);
  app.get('/codepen/:name/:snip', snip.codepen);

  var Datastore = require('nedb');

  var workmen = require("./lib/workmen");
  runWorker = function(){
    new workmen(function(pkg,dbNew){
      // worker finished - reload db
      console.log("reloading db");
      global.db = db = dbNew; 
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

var server = app.listen(port, function() {
  console.log('Listening on port %d', server.address().port);
});
