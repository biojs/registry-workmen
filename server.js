var express = require('express');
var app = express();

var Datastore = require('nedb');

var workmen = require("./lib/workmen");
new workmen(function(){
  console.log("worker finished");
});

// name has to uniq
app.get('/hello', function(req, res){
  res.send('Hello World');
});

// TODO: keep only one DB instance

app.get('/all', function(req, res){
  var db = new Datastore({ filename: __dirname + '/.necache', autoload: true });
  db.find({}).exec(function (err, docs) {
    res.send(docs);
  });
});

app.get('/detail/:name', function(req, res){
  var name = req.params.name;
  var db = new Datastore({ filename: __dirname + '/.necache', autoload: true });
  db.find({name: name}).exec(function (err, docs) {
    if( docs.length == 0){
      console.log("package " + name + " does not exist.");
    }
    res.send(docs);
  });
});

app.get('/demo/:name', function(req, res){
  res.send("in build");
});

var server = app.listen(3000, function() {
  console.log('Listening on port %d', server.address().port);
});
