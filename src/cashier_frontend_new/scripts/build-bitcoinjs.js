// This file is for building bitcoinjs-lib for the browser
const browserify = require("browserify");
const fs = require("fs");
const path = require("path");

const outputPath = path.join(__dirname, "../static/bitcoinjs-lib.js");

browserify()
  .require("bitcoinjs-lib")
  .bundle()
  .pipe(fs.createWriteStream(outputPath))
  .on("finish", () => {
    console.log("✅ bitcoinjs-lib bundle created at static/bitcoinjs-lib.js");
  })
  .on("error", (err) => {
    console.error("❌ Error creating bundle:", err);
  });
