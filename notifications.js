var irc = require('irc');
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

  counter =0;
  function speak(text) {
    if (client.connected) {
      client.say(channelName, text);
    }
    console.log(counter++);
  }

  evt.on("pkg:new", function(pkg) {
    var msg = "BioJS got a new package: " + pkg.name;
    if (pkg.author) {
      msg += " by @" + pkg.author.name;
    }
    speak(msg);
  });
  evt.on("pkg:updated", function(pkg) {
    speak("BioJS package update ", pkg.name + " to " + pkg.version);
  });
};
