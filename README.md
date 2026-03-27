# gRPC Fingerprint Engine (Go)

A Go reimplementation of the [DigitalPersona fingerprint engine gRPC wrapper](https://github.com/alhytham-tech/grpc-fingerprint-engine). This server provides fingerprint **enrollment**, **verification**, and **duplicate checking** via gRPC, powered by the DigitalPersona `dpfj` native library through CGo bindings.

Designed for use with the **DigitalPersona U.are.U 4500** fingerprint scanner.

## Features

- **EnrollFingerprint** — Combine multiple pre-registered FMDs into a single enrolled FMD
- **VerifyFingerprint** — Match a target fingerprint against enrolled candidates
- **CheckDuplicate** — Check if a fingerprint already exists in a candidate set
- **gRPC Health Check** — Built-in `grpc.health.v1.Health` service for load balancer / Kubernetes probes
- **Graceful Shutdown** — Drains active RPCs on SIGINT/SIGTERM before stopping
- **Structured Logging** — JSON-formatted logs via `log/slog` with method, duration, and status
- **Panic Recovery** — Interceptor catches handler panics and returns gRPC `Internal` error
- **Thread-Safe Enrollment** — Mutex-protected CGo enrollment for concurrent requests
- **Keepalive** — gRPC connection keepalive parameters for robust long-lived connections
- **gRPC Reflection** — Supports `grpcurl` and other introspection tools
- **Multi-stage Docker build** — Small production image with health check
- **Language agnostic** — Generate client code for any gRPC-supported language

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   gRPC Clients                      │
│        (Go, Python, PHP, JS, C++, etc.)             │
└───────────────────────┬─────────────────────────────┘
                        │ gRPC (protobuf)
                        ▼
┌─────────────────────────────────────────────────────┐
│          Go gRPC Server (port 4134)                 │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │       Interceptors (Recovery, Logging)       │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │                               │
│  ┌──────────────────▼──────────────────────────┐    │
│  │         internal/server/server.go            │    │
│  │    (EnrollFingerprint, VerifyFingerprint,    │    │
│  │              CheckDuplicate)                 │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │ CGo (thread-safe)              │
│  ┌──────────────────▼──────────────────────────┐    │
│  │         pkg/dpfj/dpfj.go                    │    │
│  │    (CGo bindings for libdpfj.so + mutex)    │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │ FFI                           │
│  ┌──────────────────▼──────────────────────────┐    │
│  │      DigitalPersona dpfj Native Library     │    │
│  │             (libdpfj.so)                    │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │        grpc.health.v1.Health                 │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

## Project Structure

```
fingerprint_grpc/
├── cmd/
│   └── server/
│       └── main.go                  # Server entry point (graceful shutdown, interceptors, health)
├── internal/
│   └── server/
│       └── server.go                # gRPC service implementation (slog, gRPC status codes)
├── pkg/
│   └── dpfj/
│       └── dpfj.go                  # CGo bindings for libdpfj (thread-safe, custom errors)
├── gen/
│   └── fingerprint/
│       ├── fingerprint.pb.go        # Generated protobuf types
│       └── fingerprint_grpc.pb.go   # Generated gRPC stubs
├── proto/
│   └── fingerprint.proto            # Protocol Buffer definition
├── Dockerfile                       # Multi-stage Docker build (Go 1.24, health probe)
├── docker-compose.yml               # Docker Compose config (health check, resource limits)
├── go.mod                           # Go module (Go 1.24)
├── go.sum                           # Go checksums
└── README.md
```

## Quick Start

### Using Docker (Recommended)

```bash
# Build and run with Docker Compose
docker compose up -d

# Or build and run manually
docker build -t fingerprint_grpc .
docker run -p 4134:4134 fingerprint_grpc
```

The server will start listening on `0.0.0.0:4134`.

### Build from Source

> **Prerequisites**: Go 1.24+, DigitalPersona Linux SDK installed (`libdpfj.so` available in system library path)

```bash
# Clone the repository
git clone https://github.com/dahirmuhammaddahir/fingerprint_grpc.git
cd fingerprint_grpc

# Install Go dependencies
go mod download

# Build (CGo required for dpfj bindings)
CGO_ENABLED=1 go build -ldflags="-s -w" -o fingerprint_server ./cmd/server/

# Run the server
./fingerprint_server
```

## Prerequisites

### DigitalPersona Linux SDK

The server requires the DigitalPersona `libdpfj` library. To install:

```bash
# Download the SDK
wget https://github.com/Bexils/grpc-fingerprint-engine/releases/download/v1.1.0/libdpfj.tar

# Extract and install
sudo mkdir -p /opt/digitalpersona
tar -xvf libdpfj.tar
sudo cp -r opt/* /opt/
sudo cp lib/* /lib/
```

### Client-Side Fingerprint Capture

This server processes **FMD (Fingerprint Minutiae Data)** — it does **not** capture fingerprints directly. You need a client-side setup to capture fingerprints from the U.are.U 4500 device and convert them to FMDs.

For client-side setup, see: [FingerPrint Client Setup](https://github.com/Ethic41/FingerPrint)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4134` | gRPC server listening port |

## API Reference

### Proto Definition

```protobuf
service FingerPrint {
    rpc EnrollFingerprint(EnrollmentRequest) returns (EnrolledFMD);
    rpc VerifyFingerprint(VerificationRequest) returns (VerificationResponse);
    rpc CheckDuplicate(VerificationRequest) returns (CheckDuplicateResponse);
}
```

### EnrollFingerprint

Combines multiple pre-registered FMDs into a single enrolled FMD for storage.

**Request:**
```json
{
  "fmdCandidates": [
    { "base64PreEnrolledFMD": "<base64-encoded-fmd-1>" },
    { "base64PreEnrolledFMD": "<base64-encoded-fmd-2>" },
    { "base64PreEnrolledFMD": "<base64-encoded-fmd-3>" },
    { "base64PreEnrolledFMD": "<base64-encoded-fmd-4>" }
  ]
}
```

**Response:**
```json
{
  "base64EnrolledFMD": "<base64-encoded-enrolled-fmd>"
}
```

### VerifyFingerprint

Checks if a target fingerprint matches any enrolled candidate.

**Request:**
```json
{
  "targetFMD": {
    "base64PreEnrolledFMD": "<base64-encoded-target>"
  },
  "fmdCandidates": [
    { "base64EnrolledFMD": "<base64-encoded-candidate-1>" },
    { "base64EnrolledFMD": "<base64-encoded-candidate-2>" }
  ]
}
```

**Response:**
```json
{
  "match": true
}
```

### CheckDuplicate

Checks if a fingerprint already exists in a set of enrolled candidates.

**Request:** Same as `VerifyFingerprint`

**Response:**
```json
{
  "isDuplicate": false
}
```

## Testing with grpcurl

```bash
# List available services
grpcurl -plaintext localhost:4134 list

# Describe the FingerPrint service
grpcurl -plaintext localhost:4134 describe fingerprint.FingerPrint

# Check server health
grpcurl -plaintext localhost:4134 grpc.health.v1.Health/Check

# Check service-specific health
grpcurl -plaintext -d '{"service": "fingerprint.FingerPrint"}' \
  localhost:4134 grpc.health.v1.Health/Check

# Call EnrollFingerprint
grpcurl -plaintext -d '{
  "fmdCandidates": [
    {"base64PreEnrolledFMD": "..."},
    {"base64PreEnrolledFMD": "..."},
    {"base64PreEnrolledFMD": "..."},
    {"base64PreEnrolledFMD": "..."}
  ]
}' localhost:4134 fingerprint.FingerPrint/EnrollFingerprint
```

## Generating Client Code

You can generate gRPC client code in any supported language from the `.proto` file:

### Go Client

```bash
protoc --go_out=. --go-grpc_out=. proto/fingerprint.proto
```

### Python Client

```bash
python -m grpc_tools.protoc \
  -I proto/ \
  --python_out=. \
  --grpc_python_out=. \
  proto/fingerprint.proto
```

### PHP Client

```bash
protoc --proto_path=proto/ \
  --php_out=. \
  --grpc_out=. \
  --plugin=protoc-gen-grpc=$(which grpc_php_plugin) \
  proto/fingerprint.proto
```

## How It Works

1. **Client captures fingerprint** from U.are.U 4500 device and extracts FMD (Fingerprint Minutiae Data)
2. **Client base64-encodes** the FMD and sends it to this gRPC server
3. **Interceptors** log the request and catch any panics
4. **Server decodes** the base64 data and calls the DigitalPersona `dpfj` native library via CGo
5. **dpfj library** performs the biometric processing (enrollment, matching, identification) — thread-safe via mutex
6. **Server returns** the result back to the client via gRPC with proper status codes
7. **On shutdown**, the server drains active RPCs gracefully before stopping

## Credits

- Original C++ implementation: [alhytham-tech/grpc-fingerprint-engine](https://github.com/alhytham-tech/grpc-fingerprint-engine)
- DigitalPersona SDK by HID Global
- Author: Dahir Muhammad Dahir

## License

This project is provided as-is. The DigitalPersona SDK is a commercial product by HID Global.
