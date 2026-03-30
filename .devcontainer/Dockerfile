FROM mcr.microsoft.com/devcontainers/python:3.12

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install couchbase-shell
RUN curl -fsSL https://github.com/couchbaselabs/couchbase-shell/releases/download/v1.1.0/couchbase-shell_1.1.0_x86_64-unknown-linux-gnu.deb -o /tmp/cbsh.deb \
    && dpkg -i /tmp/cbsh.deb \
    && rm /tmp/cbsh.deb

# Install Python dependencies.
# agentc-cli 1.0.0 declares click-extra<5.0.0 but extra-platforms>=11 removed
# extra_platforms.platform which click-extra<5 imports. We install everything
# except agentc first, then install agentc packages with --no-deps to bypass
# the conflicting click-extra constraint, leaving click-extra>=7.0.0 in place.
COPY backend/requirements.txt /tmp/requirements.txt
RUN grep -v '^agentc' /tmp/requirements.txt > /tmp/requirements-no-agentc.txt \
    && pip install -r /tmp/requirements-no-agentc.txt \
    && pip install --no-deps agentc agentc-cli agentc-core agentc-langchain agentc-langgraph
