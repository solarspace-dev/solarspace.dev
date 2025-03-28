import express from "express";
import session from "express-session";
import { Octokit } from "@octokit/core";
import { OAuthApp } from '@octokit/oauth-app';

declare module "express-session" {
  interface SessionData {
    githubToken: string;
  }
}

assertEnvVar("DOMAIN_NAME");
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
    saveUninitialized: false,
  })
);

// Landing Page
app.get("/", (req, res) => {
  res.send(`
    <h1>Login with GitHub</h1>
    <a href="/space/RaoulSchaffranek/theredguild-devcontainer">Create Space</a>
  `);
});

app.get("/space/:owner/:repo", async (req, res) => {
  const octokit = await githubLogin(req, res);
  const { owner, repo } = req.params;

  // Check if the user already has a code space for this repo
  let webUrl;
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/codespaces', {
      owner,
      repo,
    });
    if (response.data.total_count > 0) {
      const codespace = response.data.codespaces[0];
      webUrl = codespace.web_url;
    }
  } catch (error) {
    console.error("Error fetching/creating codespace:", error);
  }

  if (webUrl === undefined) {
    // If not code space exists, create a new one
    try {
      const response = await octokit.request('POST /repos/{owner}/{repo}/codespaces', {
        owner,
        repo,
        ref: "main",
        retention_period_minutes: 60 * 24, // 24 hours
      });
      webUrl = response.data.web_url;
    } catch (error) {
      console.error("Error fetching/creating codespace:", error);
    }
  }
  if (!webUrl) {
    res.status(500).send("Internal Server Error");
    return;
  }

  res.send(`<iframe src="${webUrl}" width="100%" height="100%" style="border: none;"></iframe>`)
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

// Middleware for GitHub OAuth authentication
async function githubLogin(req: express.Request, res: express.Response) : Promise<Octokit> {
  const auth_code = req.query.code;

  // If the user is returning from GitHub auth page with an auth code
  // we exchange it for an access token and store it in the session
  if (typeof auth_code === "string") {
    const { authentication } = await oauthApp.createToken({ code: auth_code });
    req.session.githubToken = authentication.token;
    req.session.save((err) => {
      if (err) {
        console.error("Error saving session:", err);
      }
    });
  }

  // If the user is not authenticated, we redirect her to GitHub for authentication
  if (!auth_code && !req.session.githubToken) {
    const redirectUri = req.originalUrl;
    res.redirect(githubLoginUrl(redirectUri));
    res.end();
    // We throw an error here because the function must return a value
    // However, the response has already been sent to the client
    throw new Error("Redirecting to GitHub login");
  }

  // If the user is authenticated, return the octokit instance
  const octokit = new Octokit({ auth: req.session.githubToken });
  return octokit;
}

function githubLoginUrl(redirect_uri: string) : string {
  const params = new URLSearchParams({
    client_id: process.env.GH_CLIENT_ID!,
    scope: "public_repo codespace",
    redirect_uri: `https://${process.env.DOMAIN_NAME}${redirect_uri}`
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}