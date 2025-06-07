import express from "express";
import path from "path";

assertEnvVar("DOMAIN_NAME");

const app = express();
const PORT = process.env.PORT || 3000;

// Landing Page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../solid/index.html"));
});

// Block embedding this site in frames
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// Serve the dist folder under the /dist route
app.use("/dist", express.static(path.join(__dirname, "../solid/dist")));

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
