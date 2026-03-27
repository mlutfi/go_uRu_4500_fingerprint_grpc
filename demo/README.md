# FingerAuth - Biometric Authentication Demo

A modern Next.js web application for fingerprint enrollment and check-in using the **DigitalPersona U.are.U 4500** scanner with direct browser integration via the WebSDK.

## Features

- **🔌 Live Device Connection**: Direct browser-to-device communication via DigitalPersona Lite Client WebSDK
- **📡 Device Status**: Real-time reader connection status with auto-reconnect
- **👤 Add User & Enroll**: 3-step wizard — create user → capture 3 fingerprints → enroll via gRPC
- **✅ Fingerprint Check-in**: Single-scan verification against all enrolled users
- **📊 Dashboard**: Real-time stats, device info, and check-in history
- **🌙 Dark Theme UI**: Premium glassmorphism design with animated feedback
- **💾 SQLite Database**: Zero-config local storage for users, FMDs, and check-in logs

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                            │
│                                                                     │
│  ┌──────────────┐    ┌──────────────────────────────────────────┐   │
│  │  Next.js App  │    │         DigitalPersona WebSDK           │   │
│  │              │    │                                          │   │
│  │  ┌─────────┐ │    │  FingerprintSdkTest                     │   │
│  │  │Dashboard│ │    │    ├── getDeviceList()                  │   │
│  │  ├─────────┤ │    │    ├── startCapture(readerId)           │   │
│  │  │ Enroll  │ │    │    ├── stopCapture()                    │   │
│  │  ├─────────┤ │    │    └── onSamplesAcquired(callback)      │   │
│  │  │Check-in │ │    │                                          │   │
│  │  ├─────────┤ │    │  FMD (Base64) ◄── Fingerprint Samples   │   │
│  │  │ Users   │ │    └──────────────┬───────────────────────────┘   │
│  │  └─────────┘ │                   │ WebSocket (localhost)         │
│  └──────┬───────┘                   │                               │
│         │                           ▼                               │
│         │              ┌─────────────────────────┐                  │
│         │              │ DigitalPersona Lite      │                  │
│         │              │ Client (Windows Service) │                  │
│         │              │ wss://127.0.0.1:52181    │                  │
│         │              └────────────┬────────────┘                  │
│         │                           │ USB                           │
│         │                           ▼                               │
│         │              ┌─────────────────────────┐                  │
│         │              │   U.are.U 4500 Scanner   │                  │
│         │              │   (Fingerprint Reader)   │                  │
│         │              └─────────────────────────┘                  │
└─────────┼───────────────────────────────────────────────────────────┘
          │ HTTP API
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SERVER (Node.js)                              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Next.js API Routes                              │   │
│  │                                                              │   │
│  │  POST /api/users ──────────┐                                 │   │
│  │  POST /api/enroll ─────────┤                                 │   │
│  │  POST /api/checkin ────────┤      ┌──────────────────────┐   │   │
│  │  GET  /api/checkins ───────┤      │    SQLite Database    │   │   │
│  │  GET  /api/users ──────────┤◄────►│  data/fingerprint.db │   │   │
│  │                            │      │                      │   │   │
│  │                            │      │  ┌─────────────────┐ │   │   │
│  │                            │      │  │ users           │ │   │   │
│  │                            │      │  │ fingerprints    │ │   │   │
│  │                            │      │  │ checkins        │ │   │   │
│  │                            │      │  └─────────────────┘ │   │   │
│  │                            │      └──────────────────────┘   │   │
│  └────────────┬───────────────┘                                 │   │
│               │ gRPC (localhost:4134)                            │   │
│               ▼                                                 │   │
│  ┌──────────────────────────────────────────────────────────┐   │   │
│  │          Go gRPC Fingerprint Engine                      │   │   │
│  │                                                          │   │   │
│  │  EnrollFingerprint(fmdCandidates[]) → enrolledFMD       │   │   │
│  │  VerifyFingerprint(targetFMD, candidates[]) → match     │   │   │
│  │  CheckDuplicate(targetFMD, candidates[]) → isDuplicate  │   │   │
│  │                                                          │   │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │   │
│  │  │  DigitalPersona dpfj C Library (CGo Bindings)   │   │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │   │
│  └──────────────────────────────────────────────────────────┘   │   │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Enrollment:
  Finger on Scanner → Lite Client → WebSDK → FMD (Base64) × 3
  → POST /api/enroll → gRPC EnrollFingerprint → Enrolled FMD → SQLite

Check-in:
  Finger on Scanner → Lite Client → WebSDK → FMD (Base64)
  → POST /api/checkin → gRPC VerifyFingerprint → Match Result → SQLite
```

## Prerequisites

- **Node.js** v18+
- **DigitalPersona U.are.U 4500** scanner connected via USB
- **DigitalPersona Lite Client 4.0** installed and running ([Download](https://crossmatch.hid.gl/lite-client/))
- **Go gRPC Fingerprint Server** running on `localhost:4134` (see main repo README)

## Getting Started

1. **Install & Start the Lite Client** (if not already running):
   - Download from [https://crossmatch.hid.gl/lite-client/](https://crossmatch.hid.gl/lite-client/)
   - Install and restart your computer
   - Verify it's running: open `https://127.0.0.1:52181/` in browser

2. **Start the Go gRPC Server**:
   ```bash
   # From the repository root
   go run cmd/server/main.go
   ```

3. **Navigate to the demo directory**:
   ```bash
   cd demo
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Configure environment** (optional, defaults to `localhost:4134`):
   ```bash
   cp .env.example .env.local
   ```

6. **Start the development server**:
   ```bash
   npm run dev
   ```

7. **Open** [http://localhost:3000](http://localhost:3000)

## Usage

### Enroll a New User
1. Go to **Add User & Enroll**
2. Fill in user details (name, employee ID, department)
3. Place your finger on the scanner **3 times** (the device auto-captures)
4. Click **Enroll Fingerprint** to save the enrolled FMD

### Check-in
1. Go to **Check In**
2. Place your finger on the scanner
3. The system automatically verifies and records the check-in

### Fallback: Manual FMD Input
If the Lite Client is not available, you can still test by pasting Base64 FMD data manually in the scanner component's fallback input.

## Project Structure

```
demo/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── checkin/route.js    # POST: verify & check-in
│   │   │   ├── checkins/route.js   # GET: list check-ins
│   │   │   ├── enroll/route.js     # POST: enroll fingerprint
│   │   │   └── users/route.js      # GET/POST: user management
│   │   ├── checkin/page.js         # Check-in page
│   │   ├── enroll/page.js          # Enrollment wizard
│   │   ├── users/page.js           # Users list
│   │   ├── globals.css             # Design system
│   │   ├── layout.js               # Root layout + WebSDK loader
│   │   └── page.js                 # Dashboard
│   ├── components/
│   │   ├── DeviceStatus.jsx        # Live reader status widget
│   │   ├── FingerprintScanner.jsx  # Scanner with WebSDK + fallback
│   │   └── Navbar.jsx              # Sidebar navigation
│   └── lib/
│       ├── db.js                   # SQLite schema & connection
│       ├── fingerprint-sdk.js      # WebSDK wrapper (browser-only)
│       └── grpc-client.js          # gRPC client wrappers
├── public/
│   └── lib/                        # DigitalPersona WebSDK JS files
├── data/                           # SQLite database (auto-created)
├── package.json
└── .env.local
```

## Technologies

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js](https://nextjs.org/) (App Router) |
| Database | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| RPC | [@grpc/grpc-js](https://www.npmjs.com/package/@grpc/grpc-js) |
| Scanner SDK | DigitalPersona WebSDK (Lite Client) |
| Styling | Vanilla CSS, custom properties, glassmorphism |
| Backend Engine | Go + DigitalPersona dpfj (CGo) |
