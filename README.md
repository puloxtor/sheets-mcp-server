# sheets-mcp-server

An MCP server for controlling Google Sheets, running the upstream
[`workspace-mcp`](https://github.com/taylorwilsdon/google_workspace_mcp) package
(MIT licensed) scoped down to just the Sheets service via `WORKSPACE_MCP_TOOLS=sheets`.

This repo used to contain a hand-rolled Node/Express server with four basic
tools (`create_spreadsheet`, `read_sheet`, `write_sheet`, `append_sheet`) and
service-account auth. It's been replaced with deployment config for the
upstream package instead, which gives you 14 Sheets tools out of the box
(ranges, tables, cell/conditional formatting, resizing, moving rows, etc.),
OAuth 2.1 login as yourself instead of a service account, and ongoing upstream
maintenance. We don't vendor its source here - the Dockerfile just
`pip install`s the published package - so bug fixes and new tools show up on
your next rebuild with no merge work.

Widening scope later (e.g. also Drive or Calendar) is a one-line env var
change: `WORKSPACE_MCP_TOOLS=sheets,drive`. See the
[service list](https://github.com/taylorwilsdon/google_workspace_mcp#services)
for everything available.

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
`streamable-http` mode, scoped to Sheets by default via
`ENV WORKSPACE_MCP_TOOLS=sheets`.

1. Copy `.env.example` to your Railway project's variables. At minimum set
   `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
   `MCP_SINGLE_USER_MODE=true`, and `USER_GOOGLE_EMAIL`.
2. Deploy once to get your public URL (e.g. `https://your-app.up.railway.app`),
   then set `WORKSPACE_MCP_BASE_URI` to that URL and redeploy.
3. Back in Google Cloud Console, add
   `https://your-app.up.railway.app/oauth2callback` as an Authorized redirect
   URI on the OAuth client.
4. Attach a persistent volume mounted at
   `/home/app/.google_workspace_mcp/credentials` (`WORKSPACE_MCP_CREDENTIALS_DIR`
   in the Dockerfile) - without it, the cached OAuth token is lost on every
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
