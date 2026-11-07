# sheets-mcp-server

Deployment config for a remote MCP server that lets Claude (or any MCP client)
work with **Google Sheets, Docs and Drive**. It runs the upstream
[`workspace-mcp`](https://github.com/taylorwilsdon/google_workspace_mcp) package
(MIT licensed) on Railway over streamable HTTP, with OAuth 2.1 login as yourself.

What's in this repo:

| File | Purpose |
|---|---|
| `Dockerfile` | Installs a pinned `workspace-mcp`, applies the scope patch, runs as a non-root user with a health check |
| `patch_scopes.py` | Build-time fix so OAuth 2.1 tokens actually carry the Google API scopes (see below) |
| `railway.json` | Railway build/deploy settings and `/health` check |
| `.env.example` | Every variable the server needs, with comments |

We don't vendor upstream's source - the Dockerfile just `pip install`s the
published package - so bug fixes and new tools arrive on your next rebuild.

The Dockerfile enables `sheets,docs,drive` by default. Change the
`WORKSPACE_MCP_TOOLS` variable to widen or narrow that (e.g. `sheets` only, or
`sheets,drive,calendar`); see the
[service list](https://github.com/taylorwilsdon/google_workspace_mcp#services).

> History: this repo started as a hand-rolled Node/Express server with four
> Sheets tools and service-account auth. It was replaced with the upstream
> package, which has 14+ Sheets tools (ranges, tables, formatting, resizing,
> moving rows, etc.) and is actively maintained.

## Why the scope patch

In OAuth 2.1 mode (`MCP_ENABLE_OAUTH21=true`), upstream asks only for the
identity scopes (`userinfo.email`, `openid`). MCP clients that authenticate with
a client ID metadata document - Claude among them - request exactly those and
ignore the scopes the server advertises, so every tool call fails with
*"OAuth credentials lack required scopes"*.

`patch_scopes.py` makes the provider require every scope the enabled tools
need, matching what upstream already does for its external-provider path.
`workspace-mcp` is pinned and the patch asserts on the exact line it changes,
so a version bump fails the build instead of silently dropping the fix. Delete
the file once upstream fixes this.

## 1. Google Cloud setup

1. Create (or reuse) a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Sheets API** (and **Google Drive API**, which Sheets
   tools use for listing/creating spreadsheets).
3. Under **APIs & Services > Credentials**, create an **OAuth client ID**:
   - **Desktop app** if you'll run this locally over stdio.
   - **Web application** if you're deploying to Railway (below) - you'll add
     the redirect URI once you know your public URL.
4. Copy the client ID/secret into `.env` (see `.env.example`).

## 2. Run locally (stdio, fastest way to try it)

No Docker needed - this talks to Claude Desktop or any stdio MCP client directly:

```bash
export GOOGLE_OAUTH_CLIENT_ID="..."
export GOOGLE_OAUTH_CLIENT_SECRET="..."
export MCP_SINGLE_USER_MODE=true
export USER_GOOGLE_EMAIL="you@example.com"

uvx workspace-mcp --tools sheets
```

First call triggers a browser OAuth consent screen; the token is cached to
disk afterward so you won't see it again.

## 3. Deploy to Railway (streamable HTTP, for remote/Connector use)

This repo's `Dockerfile` installs `workspace-mcp` and runs it in
`streamable-http` mode with Sheets, Docs and Drive enabled
(`ENV WORKSPACE_MCP_TOOLS=sheets,docs,drive`).

1. Copy `.env.example` to your Railway project's variables. At minimum set
   `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
   `MCP_SINGLE_USER_MODE=true`, and `USER_GOOGLE_EMAIL`.
2. Deploy once to get your public URL (e.g. `https://your-app.up.railway.app`),
   then set `WORKSPACE_MCP_BASE_URI` to that URL and redeploy.
   To use it as a Claude connector, also set `MCP_ENABLE_OAUTH21=true`.
3. Back in Google Cloud Console, add
   `https://your-app.up.railway.app/oauth2callback` as an Authorized redirect
   URI on the OAuth client.
4. Attach a persistent volume mounted at
   `/home/app/.google_workspace_mcp/credentials` (`WORKSPACE_MCP_CREDENTIALS_DIR`
   in `.env.example`) - without it, the cached OAuth token is lost on every
   redeploy and you'll have to re-authenticate.
5. Connect your MCP client to `https://your-app.up.railway.app/mcp`.

Health check is served at `/health` (already wired into `railway.json`).

## Notes

- Server-to-server automation without a human login: the upstream project
  also supports service-account auth via `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` -
  useful if you want to go back to the old no-browser-consent flow for
  specific sheets shared with a service account.
- Full docs, all tool tiers, and every service: <https://workspacemcp.com/docs>
  and <https://github.com/taylorwilsdon/google_workspace_mcp>.
