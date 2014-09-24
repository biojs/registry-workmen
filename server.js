var express = require('express');
var app = express();
var port = process.argv[2] || 3000;

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
    db = new Datastore({ filename: __dirname + '/.necache', autoload: true });
  })
}
runWorker();
// TODO: make this dynamic
//interval = setInterval(runWorker, 3600 * 60);

// name has to uniq
app.get('/hello', function(req, res){
  res.send('Hello World');
});

// TODO: keep only one DB instance

app.get('/all', function(req, res){
  db.find({}).exec(function (err, docs) {
    //res.jsonp(docs);
    res.jsonp(docs);
  });
});

app.get('/detail/:name', function(req, res){
  var name = req.params.name;
  var db = new Datastore({ filename: __dirname + '/.necache', autoload: true });
  db.find({name: name}).exec(function (err, docs) {
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
