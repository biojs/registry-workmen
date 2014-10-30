var hotswap = require("hotswap");
hotswap.on('swap', function() {
    // we are going to console.log(test) whenever it's changed
    console.log("SWAP");
});

require("./server.js");
