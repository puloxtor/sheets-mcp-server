FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install the upstream, published MCP server (github.com/taylorwilsdon/google_workspace_mcp)
# Pinned: patch_scopes.py below asserts against a specific line in this version.
RUN pip install --no-cache-dir workspace-mcp==1.25.2

# Upstream requests only identity scopes from client-ID-metadata MCP clients,
# which leaves every Google API call unauthorized. See patch_scopes.py.
COPY patch_scopes.py /tmp/patch_scopes.py
RUN python /tmp/patch_scopes.py && rm /tmp/patch_scopes.py

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app \
    && mkdir -p /home/app/.google_workspace_mcp/credentials \
    && chown -R app:app /home/app
USER app

# Railway injects PORT; the server also accepts WORKSPACE_MCP_PORT/defaults to 8000
EXPOSE 8000
ARG PORT
EXPOSE ${PORT:-8000}

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD sh -c 'curl -f http://localhost:${PORT:-8000}/health || exit 1'

# Services to expose. The Railway variable of the same name overrides this;
# keep the two in sync, since the OAuth scopes requested are derived from it.
ENV WORKSPACE_MCP_TOOLS=sheets,docs,drive

CMD ["workspace-mcp", "--transport", "streamable-http"]
