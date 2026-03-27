# =============================================================================
# Stage 1: Build the Go binary with CGo (requires libdpfj)
# =============================================================================
FROM golang:1.24-bookworm AS builder

WORKDIR /temp

# Download and install the DigitalPersona SDK (libdpfj)
ENV VERSION="v1.1.0"
RUN apt-get update && apt-get install -y wget && \
    wget https://github.com/Bexils/grpc-fingerprint-engine/releases/download/${VERSION}/libdpfj.tar && \
    tar -xvf libdpfj.tar && \
    cp -r opt/* /opt && \
    cp lib/* /lib && \
    rm libdpfj.tar && \
    apt-get purge -y --auto-remove wget && \
    rm -rf /var/lib/apt/lists/*

# Set up the Go workspace
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Build the Go binary with CGo enabled (required for dpfj bindings)
ENV CGO_ENABLED=1
RUN go build -ldflags="-s -w" -o fingerprint_server ./cmd/server/

# =============================================================================
# Stage 2: Minimal runtime image
# =============================================================================
FROM debian:bookworm-slim

LABEL maintainer="Dahir Muhammad Dahir"
LABEL description="gRPC Fingerprint Engine — DigitalPersona U.are.U 4500"
LABEL version="2.0.0"

# Install minimal runtime dependencies and grpc-health-probe for healthchecks
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates wget && \
    ARCH=$(dpkg --print-architecture) && \
    wget -qO /usr/local/bin/grpc_health_probe \
      https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/v0.4.35/grpc_health_probe-linux-${ARCH} && \
    chmod +x /usr/local/bin/grpc_health_probe && \
    apt-get purge -y --auto-remove wget && \
    rm -rf /var/lib/apt/lists/*

# Copy the DigitalPersona SDK libraries
COPY --from=builder /opt /opt
COPY --from=builder /lib/libdpfj* /lib/

# Copy the compiled Go binary
WORKDIR /app
COPY --from=builder /app/fingerprint_server .

# Configure environment
ENV PORT=4134
ENV LD_LIBRARY_PATH=/lib:/opt
EXPOSE 4134

# Health check via grpc_health_probe
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD ["grpc_health_probe", "-addr=:4134"]

ENTRYPOINT ["./fingerprint_server"]
