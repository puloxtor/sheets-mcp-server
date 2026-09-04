"""Force the OAuth 2.1 provider to request every scope the enabled tools need.

Upstream builds GoogleProvider with required_scopes=PROTOCOL_AUTH_SCOPES, which
is just userinfo.email + openid. MCP clients that authenticate with a client ID
metadata document - Claude among them - request exactly those scopes and ignore
the scopes_supported we advertise, so the issued token carries no Google API
scope and every tool call fails with "OAuth credentials lack required scopes".

Passing provider_valid_scopes instead is what the ExternalOAuthProvider branch
a few lines above already does, so this aligns the two paths rather than
inventing behaviour.

Drop this file once upstream fixes it. The build fails loudly if the patched
line moves, so a version bump can never silently lose the fix.
"""

import pathlib
import sysconfig

OLD = "required_scopes=provider_required_scopes,"
NEW = "required_scopes=provider_valid_scopes,"

path = pathlib.Path(sysconfig.get_paths()["purelib"]) / "core" / "server.py"
if not path.is_file():
    raise SystemExit(f"patch_scopes: {path} not found; workspace-mcp layout changed.")

source = path.read_text()
found = source.count(OLD)
if found != 1:
    raise SystemExit(
        f"patch_scopes: expected exactly 1 occurrence of {OLD!r} in {path}, "
        f"found {found}. Upstream changed - re-verify the fix before deploying."
    )

path.write_text(source.replace(OLD, NEW))
print(f"patch_scopes: patched {path}")
