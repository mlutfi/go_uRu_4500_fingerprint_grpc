# FingerAuth - Biometric Authentication Demo

A modern Next.js web application demonstrating fingerprint enrollment and check-in using the DigitalPersona U.are.U 4500 gRPC engine. 

![FingerAuth Demo](./screenshot.png) *(UI Screenshot Placeholder)*

## Features

- **Add User & Enroll**: Streamlined 3-step wizard to register users and enroll their fingerprints (requires 3 fingerprint captures to generate one enrolled FMD).
- **Fingerprint Check-in**: Single-scan verification that checks against all enrolled users in the database.
- **Dashboard**: Real-time stats and check-in history.
- **Dark Theme UI**: Premium glassmorphism design with responsive components and animated feedback.
- **SQLite Database**: Zero-config local database to store users, FMDs, and check-in logs.

## Architecture

This Next.js app acts as a client to the Go gRPC Fingerprint Server:

1. Frontend captures Base64 FMD data (simulated via paste or real scanner integration).
2. Next.js API Routes (`/api/enroll`, `/api/checkin`) receive the request.
3. Node.js `grpc-js` client communicates over port `4134` with the Go server to execute `EnrollFingerprint` and `VerifyFingerprint`.
4. Results are saved locally in the `data/fingerprint.db` SQLite database.

## Prerequisites

- **Node.js** v18+
- The **Go gRPC Fingerprint Server** must be running on `localhost:4134` (See the main repository `README.md` for startup instructions).

## Getting Started

1. Navigate to the demo directory:
   ```bash
   cd demo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables (optional, defaults to `localhost:4134`):
   ```bash
   cp .env.example .env.local
   # Edit .env.local if your gRPC server is on a different host/port
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Test without a Physical Scanner

If you don't have the U.are.U 4500 scanner connected to a browser capture tool, you can test the application by pasting valid Base64 FMD (Fingerprint Minutiae Data) strings into the text areas on the UI.

1. **Enrollment**: Go to "Add User & Enroll", enter a name, and paste a valid pre-enrolled Base64 FMD 3 times.
2. **Check-in**: Go to "Check In" and paste a matching pre-enrolled Base64 FMD to trigger a successful match.

## Project Structure

- `src/app/api/*`: Next.js App Router API endpoints for users, enrollment, and check-ins.
- `src/app/*`: Frontend pages (Dashboard, Enroll, Checkin, Users).
- `src/components/*`: Reusable UI components including the animated scanner.
- `src/lib/db.js`: SQLite database initialization and schema.
- `src/lib/grpc-client.js`: Promisified gRPC client wrappers for the fingerprint proto.
- `data/`: Auto-generated directory where the SQLite database `fingerprint.db` is stored.

## Technologies Used

- **Framework**: [Next.js 14/15](https://nextjs.org/) (App Router)
- **Database**: [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- **RPC**: [@grpc/grpc-js](https://www.npmjs.com/package/@grpc/grpc-js)
- **Styling**: Vanilla CSS with modern custom properties and flex/grid layouts.
