var express = require('express');
var app = express();

var Datastore = require('nedb');

var workmen = require("./lib/workmen");
new workmen(function(){
  console.log("worker finished");
});

// name has to uniq
app.get('/hello.txt', function(req, res){
  res.send('Hello World');
});

app.get('/seb', function(req, res){
  var db = new Datastore({ filename: __dirname + '/.necache', autoload: true });
  db.find({}).exec(function (err, docs) {
    res.send(docs);
  });
});

var server = app.listen(3000, function() {
  console.log('Listening on port %d', server.address().port);
});
