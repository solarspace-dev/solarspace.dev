import express from "express";
import session from "express-session";
import { Octokit } from "@octokit/core";
import { OAuthApp } from '@octokit/oauth-app';

declare module "express-session" {
  interface SessionData {
    accessToken?: string;
  }
}

assertEnvVar("GH_CLIENT_ID");
assertEnvVar("GH_CLIENT_SECRET");
assertEnvVar("SESSION_SECRET");

const app = express();
const PORT = process.env.PORT || 3000;

const oauthApp = new OAuthApp({
  clientType: "oauth-app",
  clientId: process.env.GH_CLIENT_ID!,
  clientSecret: process.env.GH_CLIENT_SECRET!,
});

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: true,
  })
);

// Landing Page
app.get("/", (req, res) => {
  res.send(`
    <h1>Login with GitHub</h1>
    <a href="/login">Login</a>
  `);
});

// Step 1: Redirect user to GitHub
app.get("/login", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GH_CLIENT_ID!,
    scope: "public_repo codespace",
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

// Step 2: GitHub redirects back with `code`
app.get("/callback", async (req, res) => {
  const code = req.query.code as string;
   if (!code) {
    res.status(400).send("Missing code");
    return;
   }

  try {
    // Exchange code for access token
    const { authentication } = await oauthApp.createToken({ code })
    req.session.accessToken = authentication.token;
    res.redirect("/repos");
  } catch (err) {
    console.error("OAuth error:", err);
    res.status(500).send("OAuth error");
  }
});

// Step 3: Use Octokit to fetch user's repos
app.get("/repos", async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.redirect("/");

  try {
    const octokit = new Octokit({ auth: token });

    const response = await octokit.request("GET /user/repos", {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    const repos = response.data as any[];
    const list = repos.map((r) => `<li>${r.full_name}</li>`).join("");

    res.send(`<h2>Your Repos</h2><ul>${list}</ul><a href="/logout">Logout</a>`);
  } catch (err: any) {
    console.error("Fetch repos error:", err);
    res.status(500).send("Failed to fetch repos");
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
});

function assertEnvVar(name: string){
  if (!(name in process.env)) {
    throw new Error(`Environment variable ${name} is required`);
  }
}