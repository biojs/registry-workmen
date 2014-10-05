module.change_code = 1; 
// THIS separation is done because it allows hotswapping

var snip = {};

snip._demoFill = function (res, item){
  item.inlineScript += ";if(parents !== undefined) {m.g.onAll(function(name,data){ parent.events.trigger.apply(this,arguments)})};";
  res.render("single", {scripts: item.js, css: item.css, inlineScript: item.inlineScript, inlineBody: item.inlineBody});
};

module.exports = snip;
