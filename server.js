var express = require('express');
var compress = require('compression');
var swig = require("swig");
var _ = require("underscore");
var responseTime = require('response-time')


var queries = require("./routes/queries");
var snip = require("./routes/snippet");
var wares = require("./lib/serverMiddleware");

// cfg
var port = process.env.PORT || process.argv[2] || 3000;
var refreshTime = process.env.REFRESH_TIME || 3600; // in s
var keywords = ['biojs', 'bionode'];

global.ghProxy = "http://cdn.rawgit.com/"

// setup swig in express
var app = express();
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/templates');
app.use(compress());

// workmen

var workflow = require("./workflow");

// set DB as global
workflow.dbLoad.then(function(){
  global.db = workflow.db; 
})

workflow.keys = keywords;
workflow.run().then(function(){
  console.log(".saved.");
})

// TODO: make this more dynamic
interval = setInterval(workflow.run, refreshTime * 1000);

// middlewares
app.use(wares.cors);
app.disable('x-powered-by');
app.use(wares.poweredBy);
app.use(wares.cacheControl);
app.use(responseTime())

// routes
app.get('/', function mainpage(req, res){
  res.sendFile("./README.md", {root: __dirname});
});
app.get('/all', queries.all);
app.get('/stat', queries.stat);
app.get('/detail/:name', queries.detail);

// interactive
app.get('/demo/:name/:snip', snip.demo);
app.get('/demo/:name/:snip/*', snip.demo);
app.get('/demo/:name', snip.overview);

// forwarder
app.get('/jsbin/:name/:snip', snip.jsbin);
app.get('/codepen/:name/:snip', snip.codepen);

// proxies
app.get('/github/:name/:repo/*', snip.github);


var server = app.listen(port, function() {
  console.log('Listening on port %d', server.address().port);
});
