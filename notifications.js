var irc = require('irc');
var swig = require('swig');
var email = require("emailjs");
var Twit = require('twit');
var ATOM = require('atom');
var RSS = require('rss');

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

var isHeroku = !!process.env["MANDRILL_USERNAME"];
if (isHeroku) {
  var server = email.server.connect({
    user: process.env["MANDRILL_USERNAME"],
    password: process.env["MANDRILL_APIKEY"],
    host: "smtp.mandrillapp.com",
    ssl: true,
    domain: "heroku.com"
  });
}

var channelName = "#biojs";

var client = new irc.Client('irc.freenode.net', 'biojs-registry', {
  userName: "biojs-registry",
  secure: true,
  port: 7000,
  showError: false,
  debug: false,
  floodProtection: true,
  floodProtectionDelay: 500,
  channels: [channelName]
});

client.addListener("error", function() {});

module.exports = function(opts) {
  var evt = opts.evt;
  var log = opts.log;

  client.join(channelName, function() {
    client.connected = true;
    log.info("joined irc channel");
  });

  //var msgBuffer = [];
  var msgBufferMaxLength = 10;

  var newsConfig = {
    title: "BioJS registry news feed",
    description: "Package events from biojs.io",
    feed_url: "http://workmen.biojs.net/news/rss",
    site_url: "http://biojs.io",
    language: "en",
    ttl: "5",
    pubDate: new Date(),
    date: new Date(),
    updated: new Date(),
  };
  var rfeed = new RSS(newsConfig);
  var afeed = new ATOM(newsConfig);
  this.rss = function(req, res) {
    var xml = rfeed.xml({
      indent: true
    });
    res.send(xml);
  };
  this.atom = function(req, res) {
    var xml = afeed.xml({
      indent: true
    });
    res.send(xml);
  };

  function addRSS(text, pkg) {
    var item = {
      title: text,
      url: "http://biojs.io/" + pkg.name,
      date: new Date()
    };
    if (pkg.author && pkg.author.name) {
      item.author = pkg.author.name;
    }
    rfeed.item(item);
    afeed.item(item);
    // fix atom
    afeed.items[afeed.items.length - 1].updated = new Date();
    while (rfeed.items.length > msgBufferMaxLength) {
      rfeed.items.shift();
    }
    while (afeed.items.length > msgBufferMaxLength) {
      afeed.items.shift();
    }
  }

  function speak(text, pkg) {

    //msgBuffer.unshift(text);
    //while (msgBuffer.length > msgBufferMaxLength) {
    //msgBuffer.pop();
    //}

    // post to IRC
    if (client.connected) {
      client.say(channelName, text);
    }

    // post to twitter
    if (T) {
      T.post('statuses/update', {
        status: text + " #biojs #npm #biojsio"
      }, function(err, data, response) {
        if (err) {
          log.error(err);
        }
      });
    }

    // add RSS
    addRSS(text, pkg);
  }

  var newPkgMail = swig.compileFile(__dirname + '/templates/mails/new_package.tpl');

  evt.on("pkg:new", function(pkg) {
    var msg = "BioJS got a new package: " + pkg.name;
    if (pkg.author && pkg.author.name) {
      msg += " by @" + pkg.author.name;
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
        }
      });
    }
  });
  evt.on("pkg:updated", function(pkg) {
    var text = "BioJS package update: " + pkg.name + " to " + pkg.version;
    if (pkg.author && pkg.author.name) {
      text += " by @" + pkg.author.name;
    }
    speak(text, pkg);
  });
};
