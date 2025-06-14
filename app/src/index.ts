import express from "express";
import path from "path";
import fs from "fs";

assertEnvVar("DOMAIN_NAME");

const app = express();
const PORT = process.env.PORT || 3000;

const LANDING_PAGE_DIST = path.join(__dirname, "../solid/dist");

const VSCODE_DIST_DIR = path.join(__dirname, "../vscode-web");
const VSCODE_ETH_CLONE_DIST_DIR = path.join(__dirname, "../eth-clone");

// Landing Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../solid/index.html"));
});
app.use("/dist", express.static(LANDING_PAGE_DIST));

// VSCode
app.get("/address/:address", async (req, res) => {
  const filePath = path.join(__dirname, "../vscode/index.html"); 
  const workbenchTemplate = await fs.promises.readFile(filePath, "utf-8");
  const values : { [key: string]: string } = {
    'WORKBENCH_WEB_BASE_URL': `https://${process.env.DOMAIN_NAME}/vscode`,
  };
  const data = workbenchTemplate.replace(/\{\{([^}]+)\}\}/g, (_, key) => values[key] ?? 'undefined')
  res.send(data);
});
app.use("/vscode", express.static(VSCODE_DIST_DIR));
app.use('/vscode-eth-clone', express.static(VSCODE_ETH_CLONE_DIST_DIR));

// Block embedding this site in frames
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  next();
});


// Forward to GitHub Codespaces Creation Page
app.get("/github/:owner/:repo", async (req, res) => {
  const { owner, repo } = req.params;
  res.redirect(`https://codespaces.new/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
});

app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});

function assertEnvVar(name: string){
  if (!(name in process.env)) {
    throw new Error(`Environment variable ${name} is required`);
  }
}
