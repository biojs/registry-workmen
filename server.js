var express = require('express');
var app = express();
var port = process.env.PORT || process.argv[2] || 3000;
var refreshTime = process.env.REFRESH_TIME || 3600 * 60; // in ms

//CORS middleware
var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}
app.use(allowCrossDomain);


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

// name has to uniq
app.get('/hello', function(req, res){
  res.send('Hello World');
});

// TODO: keep only one DB instance

app.get('/all', function(req, res){
  db().find().exec(function (err, docs) {
    console.log("len", docs.length);
    res.jsonp(docs);
  });
});

app.get('/detail/:name', function(req, res){
  var name = req.params.name;
  db().find({name: name}).exec(function (err, docs) {
    if( docs.length == 0){
      console.log("package " + name + " does not exist.");
    }
    res.jsonp(docs);
  });
});

app.get('/demo/:name', function(req, res){
  res.send("in build");
});

app.get('/', function(req, res){
  res.sendFile("./README.md", {root: __dirname});
});

var server = app.listen(port, function() {
  console.log('Listening on port %d', server.address().port);
});
