FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install the upstream, published MCP server (github.com/taylorwilsdon/google_workspace_mcp)
RUN pip install --no-cache-dir workspace-mcp

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

# Scope the server to just Sheets by default; override WORKSPACE_MCP_TOOLS
# (e.g. "sheets,drive") to enable more services without touching this Dockerfile.
ENV WORKSPACE_MCP_TOOLS=sheets

CMD ["workspace-mcp", "--transport", "streamable-http"]
