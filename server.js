var express = require('express');
var compress = require('compression');
var swig = require("swig");
var responseTime = require('response-time');


var queries = require("./routes/queries");
var snip = require("./routes/snippet");
var wares = require("./lib/serverMiddleware");

// cfg
var port = process.env.PORT || process.argv[2] || 3000;
var opts = {};
opts.refreshTime = process.env.REFRESH_TIME || 3600; // in s
opts.keys = ['biojs', 'bionode'];
opts.registryURL = "http://registry.npmjs.eu";

global.ghProxy = "http://cdn.rawgit.com/";

// setup swig in express
var app = express();
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/templates');
app.use(compress());

// workmen

var workflow = require("./workflow");
var flow = new workflow(opts);

// set DB as global
flow.dbLoad.then(function(){
  global.db = flow.db; 
});

flow.start().then(function(){
  console.log(".saved.");
});

// middlewares
app.use(wares.cors);
app.disable('x-powered-by');
app.use(wares.poweredBy);
app.use(wares.cacheControl);
app.use(responseTime());
app.use(wares.checkDB);

// routes
app.get('/', function mainpage(req, res){
  res.sendFile("./README.md", {root: __dirname});
});
app.get('/all', queries.all);
app.get('/stat', queries.stat);
app.get('/search', queries.search);
app.get('/detail/:name', queries.detail);

// interactive
app.get('/demo/:name/:snip', snip.demo);
app.get('/demo/:name/:snip/*', snip.demo);
app.get('/demo/:name', snip.overview);

// forwarder
app.get('/codepen/:name/:snip', snip.codepen);
app.get('/jsbin/:name/:snip', snip.jsbin);
app.get('/plunker/:name/:snip', snip.plunker);

// proxies
app.get('/github/:name/:repo/*', snip.github);


var server = app.listen(port, function() {
  console.log('Listening on port %d', server.address().port);
});
