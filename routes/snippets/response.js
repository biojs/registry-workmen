module.change_code = 1;
// THIS separation is done because it allows hotswapping

var snip = {};
var instanceTag = "\/\/@biojs-instance=([.a-zA-Z0-9_]+).*";

snip._demoFill = function(res, item) {
  // TODO: experimental way to send events to the main window
  var instTag = new RegExp(instanceTag);
  if (item.inlineScript.search(instTag) >= 0) {
    item.inlineScript += snip._buildInstanceHeader();
    item.inlineScript = item.inlineScript.replace(instTag, "$1" + snip._buildInstanceFooter());
  }
  res.render("single", {
    scripts: item.js,
    css: item.css,
    inlineScript: item.inlineScript,
    inlineBody: item.inlineBody
  });
};
snip._buildInstanceHeader = function() {
  // fn to check for iframe
  return "function inIframe(){try{return window.self!==window.top}catch(e){return true}}";
};

snip._buildInstanceFooter = function() {
  var foot = ".on('all',function(name,data){";
  foot += 'var obj = {name: name, data: data};';
  foot += 'if(inIframe()){ parent.postMessage(obj, "*") }})';
  return foot;
};

snip.removeTags = function(item) {
  var instTag = new RegExp(instanceTag + "\n");
  item.inlineScript = item.inlineScript.replace(instTag, "");
};

module.exports = snip;
