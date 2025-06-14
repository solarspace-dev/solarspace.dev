const tar = require('tar');
const fs = require('fs');
const path = require('path');

const VSCODE_VERSION = "1.101.0";
const VSCODE_ARCHIVE_FILE = 'vscode-web.tar.gz';
const VSCODE_DIST_DIR = path.join(__dirname, "../vscode-web");
const DOWNLOAD_URL = `https://update.code.visualstudio.com/${VSCODE_VERSION}/web-standalone/stable`;

// We are using a pinned VSode version for simplicity
// Alternatively, we could use the latest version by fetching it dynamically
// https://update.code.visualstudio.com/api/update/web-standalone/stable/latest

main();

async function main() {
  if (fs.existsSync(VSCODE_DIST_DIR)) {
    console.log("VSCode distribution already exists. Not downloading again.");
    return;
  }
  console.log("VSCode distribution not found.");

  if (fs.existsSync(VSCODE_ARCHIVE_FILE)) {
    console.log("VSCode archive exists.");
  } else {
    console.log("VSCode archive not found. Downloading...");
    const response = await fetch(DOWNLOAD_URL);    
    const buffer = await response.arrayBuffer();
    const filePath = `./vscode-web.tar.gz`;
    fs.writeFileSync(filePath, Buffer.from(buffer));
  }    

  console.log("Extracting VSCode distribution...");
  await tar.x({
      file: VSCODE_ARCHIVE_FILE,
  });
  
  if (!fs.existsSync(VSCODE_DIST_DIR)) {
    console.error("Failed to extract VSCode distribution.");
    return;
  }
  console.log("VSCode distribution extracted successfully.");
}