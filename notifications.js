var irc = require('irc');
var swig = require('swig');
var email = require("emailjs");
var Twit = require('twit');

var isTwitter = !!process.env.TWITTER_CONSUMER_SECRET && !!process.env.TWITTER_CONSUMER_KEY && !!process.env.TWITTER_ACCESS_SECRET && !!process.env.TWITTER_ACCESS_TOKEN;

if (isTwitter) {
  console.log("twitter notifications are enabled");
  var T = new Twit({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET
  });
} else {
  console.log("no twitter tokens provided");
}
var genericdb = require("./lib/genericdb");
var util = require('util');

module.exports = function(opts) {
  var evt = opts.evt;
  var log = opts.log;
  var ircOpts = opts.irc;
  var isProduction = opts.isProduction;

  if (isProduction) {
    log.debug("notifications are in production mode");
    var server = email.server.connect({
      user: process.env["MANDRILL_USERNAME"],
      password: process.env["MANDRILL_APIKEY"],
      host: "smtp.mandrillapp.com",
      ssl: true,
      domain: "heroku.com"
    });
  } else {
    log.debug("notifications are in production mode");
  }

  var isIRC = isProduction;
  if (isIRC) {
    var client = new irc.Client(ircOpts.network, ircOpts.userName, {
      userName: ircOpts.userName,
      secure: true,
      port: 7000,
      showError: false,
      debug: false,
      floodProtection: true,
      floodProtectionDelay: 500,
      channels: [ircOpts.channelName]
    });

    client.addListener("error", function(err) {
      console.warn("irc:", err);
    });
  }



  if (isIRC && !!client) {
    client.join(ircOpts.channelName, function() {
      client.connected = true;
      log.info("joined irc channel");
    });
  }

  // load a permanent datastorage
  var database = function(opts) {
    this.log = log;
    this.neCacheName = __dirname + '/.necache_pkgevents';
    this.mongoCollection = "pkgevents";
  };
  genericdb.mixin(database.prototype);
  var self = this;
  this.db = new database();
  this.db.loadDB().then(function() {
    log.debug("notification db loaded");
  });


  var newsConfig = {
    title: "BioJS registry news feed",
    description: "Package events from biojs.io",
    newsUrl: "http://workmen.biojs.net/news",
    siteUrl: "http://biojs.io",
    author: "BioJS",
    authorEmail: "biojs@googlegroups.com",
    lang: "en",
    ttl: "5",
  };
  var getTitle = function(pkg) {
    var msg = "";
    if (pkg.updateType === "new") {
      msg = "BioJS got a new package: " + pkg.name;
    } else {
      msg = "BioJS package update: " + pkg.name;
    }
    if (pkg.author && pkg.author.name) {
      msg += " by " + pkg.author.name;
    }
    return msg;
  };

  var news = function(type) {
    return function(req, res) {
      var filt = {};
      var limit = req.query.limit || 5;
      var versions = req.query.versions;
      if (versions) {
        filt.$or = [{
          updateVersionType: {
            $in: versions
          }
        }, {
          updateVersionType: {
            $exists: false
          }
        }];
      }
      self.db.db().find(filt).sort({
        time: -1
      }).limit(limit).exec(function(err, posts) {
        if (err) {
          log.error(err);
        }
        posts.forEach(function(p) {
          if (p.updateType === "update") {
            p.title = p.name + ":" + p.updateVersionType + " update to " + p.version;
          } else {
            if (p.author) {
              p.title = p.author.name + " published " + p.name;
            } else {
              p.title = "BioJS got a new package: " + p.name;
            }
          }
          p.url = "http://biojs.io/d/" + p.name;
          p.date = new Date(p.time);
          p.id = p.name + "@" + p.version;
        });
        if (type === "json") {
          return res.jsonp(posts);
        } else {
          res.render("news/" + type, {
            site: newsConfig,
            currentDate: new Date(),
            posts: posts
          });
        }
      });
    };
  };
  this.atom = news("atom");
  this.rss = news("rss");
  this.json = news("json");

  function speak(text, pkg) {

    // post to IRC
    if (isIRC && client && client.connected) {
      client.say(ircOpts.channelName, text);
    }

    // log to DB
    if (self.db.loaded) {
      self.db.db().update({
        nonexisting: true
      }, {
        name: pkg.name,
        version: pkg.version,
        author: pkg.author,
        description: pkg.description,
        updateType: pkg.updateType,
        updateVersionType: pkg.updateVersionType,
        time: new Date().getTime()
      }, {
        upsert: true
      }, function(err, doc) {
        if (err) {
          log.error(err);
        }
      });
    }

    // post to twitter
    var validType = ["major", "premajor", "minor", "preminor"];
    // only allow new packages or important releases
    if (!!T && (pkg.updateType === "new" || (validType.indexOf(pkg.updateVersionType) >= 0 && pkg.updateVersionType != undefined))) {
      T.post('statuses/update', {
        status: text + "\n" + "http://biojs.io/d/" + pkg.name + " #biojs"
      }, function(err, data, response) {
        if (err) {
          log.error(err);
        }
      });
    } else {
      log.debug(text + "was NOT displayed on twitter. updateType: " + pkg.updateType + " ,releaseType: " + pkg.updateVersionType);
    }
  }

  var newPkgMail = swig.compileFile(__dirname + '/templates/mails/new_package.tpl');

  evt.on("pkg:new", function(pkg) {
    var msg = "BioJS got a new package: " + pkg.name;
    if (pkg.author && pkg.author.name) {
      msg += " by " + pkg.author.name;
    }
    speak(msg, pkg);

    if (pkg.author && pkg.author.email != undefined) {
      log.info("sending new pkg mail for " + pkg.name);
      server.send({
        from: "BioJS registry <noreply@biojs.net>",
        to: pkg.author.name + "<" + pkg.author.email + ">",
        bcc: "greenify <greeenify@gmail.com>",
        subject: "BioJS registry:" + pkg.name + " published",
        text: newPkgMail({
          author: pkg.author.name,
          url: "http://biojs.io/" + pkg.name,
          name: pkg.name
        })
      }, function(err, message) {
        if (err) {
          log.warn(err);
        } else {
          log.debug("mail: " + message);
        }
      });
    } else {
      log.warn("no author info for " + pkg.name);
    }
  });
  evt.on("pkg:updated", function(pkg) {
    var text = "BioJS package update: " + pkg.name + " to " + pkg.version;
    if (pkg.author && pkg.author.name) {
      text += " by " + pkg.author.name;
    }
    speak(text, pkg);
  });
};
