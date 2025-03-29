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
  // Ensure user is logged in
  const octokit = await githubLogin(req, res);

  // Which branch to use?
  const { owner, repo } = req.params;
  let ref = req.query.ref;
  if (typeof ref !== "string") {
    try {
      const response = await octokit.request('GET /repos/{owner}/{repo}', {
        owner,
        repo,
      });
      ref = response.data.default_branch;
    } catch (error) {
      res.status(404).send("Repository not found.");
      return;
    }
  }

  // Check if the user already has a code space for this repo,branch combination
  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/codespaces', {
      owner,
      repo,
    });
    // Find the code space with the specified ref
    const codespace = response.data.codespaces.find((cs) => cs.git_status.ref === ref);
    if (codespace?.web_url) {  
      res.redirect(codespace.web_url);
      return;
    }
  } catch (error) {
    console.error("Error fetching codespaces:", error);
    res.status(500).send("Error fetching codespaces.");
    return;
  }
  // If no codespace is found, we create a new one
  try {
    const response = await octokit.request('POST /repos/{owner}/{repo}/codespaces', {
      owner,
      repo,
      ref
    });
    const codespace = response.data;
    if (codespace.web_url) {
      res.redirect(codespace.web_url);
      return;
    }
  } catch (error) {
    console.error("Error creating codespace:", error);
    res.status(500).send("Error creating codespace.");
    return;
  }
  // If we reach here, something went wrong
  res.status(500).send("Error creating codespace.");
  return;
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

// Ensure user is logged into GitHub
// If not, redirect her to GitHub for authentication and set the redirect_uri to the current URL
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