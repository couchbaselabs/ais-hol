FROM mcr.microsoft.com/devcontainers/python:3.12

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Rust toolchain
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Build and install couchbase-shell (slow cargo build baked into image)
RUN cargo install --git https://github.com/couchbaselabs/couchbase-shell.git --tag v1.1.0 --locked

# Install Python dependencies
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt
