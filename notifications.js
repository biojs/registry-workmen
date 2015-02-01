var irc = require('irc');
var swig = require('swig');
var email = require("emailjs");

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

  function speak(text) {
    if (client.connected) {
      client.say(channelName, text);
    }
  }

  var newPkgMail = swig.compileFile(__dirname + '/templates/mails/new_package.tpl');

  evt.on("pkg:new", function(pkg) {
    var msg = "BioJS got a new package: " + pkg.name;
    if (pkg.author) {
      msg += " by @" + pkg.author.name;
    }
    speak(msg);

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
    speak("BioJS package update ", pkg.name + " to " + pkg.version);
  });
};
