var express = require('express');
var compress = require('compression');
var swig = require("swig");
var winston = require('winston');
var expressWinston = require('express-winston');
var responseTime = require('response-time');

// configuration

var port = process.env.PORT || process.argv[2] || 3000;
var opts = {};
opts.refreshTime = process.env.REFRESH_TIME || 3600; // in s
opts.keys = ['biojs', 'bionode'];
opts.registryURL = "http://registry.npmjs.com";
opts.iotagurl = "https://raw.githubusercontent.com/biojs-dead/io-ratings/master/list.json";
opts.debug = !!process.env.REG_DEBUG;

var services = {
  browserifyCDN: "https://wzrd.in/bundle/",
  rawgit: "/github/",
  ghProxy: "https://cdn.rawgit.com/",
  parcelifyCDN: "http://parce.li/bundle/"
};

// init logging
//
var logOpts = {
  transports: [
    new(winston.transports.Console)({
      colorize: true,
      prettyPrint: false
    }),
    //new(winston.transports.File)({
    //filename: 'logs/main.log'
    //})
  ]
};
var mongo = require("./lib/database.js");
if (mongo.prototype.isMongo()) {
  var MongoDB = require('winston-mongodb').MongoDB;
  var mongoTransport = new MongoDB({
    collection: "logs",
    dbUri: mongo.prototype.getMongoUri(),
    capped: true,
    cappedSize: 10000000, // roughly 10 MB
  });
  logOpts.transports.push(mongoTransport);
  console.log("using MongoDB as winston log storage");
}
var logger = new winston.Logger(logOpts);

// require routes  & middleware

var queries = (require("./routes/queries"))(logger);
var snip = (require("./routes/snippet"))({
  log: logger,
  services: services
});
var wares = require("./lib/serverMiddleware");


// setup swig in express
var app = express();
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/templates');
app.use(compress());

// workmen

var workflow = require("./workflow")(logger);
var flow = new workflow(opts);

// set DB as global
flow.dbLoad.then(function() {
  global.db = flow.db;
});

flow.start().then(function() {
  logger.info(".saved.");
});

var notifications = require("./notifications");
var notify = new notifications({
  evt: flow,
  log: logger,
  irc: {
    network: 'irc.freenode.net',
    userName: "biojs-registry",
    channelName: "#biojs"
  },
  isProduction: process.env["MANDRILL_USERNAME"] && !process.env["DEV_REGISTRY"]
});

// middlewares
app.use(wares.cors);
app.disable('x-powered-by');
app.use(wares.poweredBy);
app.use(wares.cacheControl);
app.use(responseTime());
app.use(wares.checkDB);

var expressTransports = [
  new winston.transports.Console({
    json: false,
    colorize: true
  }),
];

if (mongo.prototype.isMongo()) {
  expressTransports.push(mongoTransport);
}

// log all requests
app.use(expressWinston.logger({
  transports: expressTransports,
  meta: false,
  msg: "HTTP {{req.method}} {{res.statusCode}} {{req.url}}",
  colorStatus: true
}));

// routes
app.get('/', function mainpage(req, res) {
  res.sendFile("./README.md", {
    root: __dirname
  });
});
app.get('/all', queries.all);
app.get('/stat', queries.stat);
app.get('/logs', queries.logs);
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

// news
app.get('/news/rss', notify.rss);
app.get('/news/atom', notify.atom);
app.get('/news/json', notify.json);


var server = app.listen(port, function() {
  logger.info('Listening on port %d', server.address().port);
});
server.timeout = 10000;
