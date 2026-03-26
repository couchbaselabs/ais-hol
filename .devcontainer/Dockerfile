FROM mcr.microsoft.com/devcontainers/python:3.12

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install couchbase-shell
RUN curl -fsSL https://github.com/couchbaselabs/couchbase-shell/releases/download/v1.1.0/couchbase-shell_1.1.0_x86_64-unknown-linux-gnu.deb -o /tmp/cbsh.deb \
    && dpkg -i /tmp/cbsh.deb \
    && rm /tmp/cbsh.deb

# Install Python dependencies
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt
