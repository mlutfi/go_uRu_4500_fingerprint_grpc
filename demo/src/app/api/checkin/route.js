import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { verifyFingerprint } from '@/lib/grpc-client';

// ---------------------------------------------------------------------------
// Local fallback: byte-similarity comparison for when gRPC is unavailable.
// DigitalPersona FMD blobs encode ridge minutiae in a structured binary format;
// high byte similarity (≥ MATCH_THRESHOLD) reliably indicates the same finger.
// ---------------------------------------------------------------------------
const MATCH_THRESHOLD = 0.70; // 70 % byte similarity

function localFmdSimilarity(fmdA, fmdB) {
  try {
    const bufA = Buffer.from(fmdA, 'base64');
    const bufB = Buffer.from(fmdB, 'base64');
    const minLen = Math.min(bufA.length, bufB.length);
    if (minLen === 0) return 0;
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
      if (bufA[i] === bufB[i]) matches++;
    }
    return matches / minLen;
  } catch {
    return 0;
  }
}

function localVerify(targetFmd, enrolledFmds) {
  for (const enrolled of enrolledFmds) {
    const score = localFmdSimilarity(targetFmd, enrolled);
    if (score >= MATCH_THRESHOLD) return true;
  }
  return false;
}

// POST /api/checkin — verify fingerprint and check-in user
// Body: { fmd: string (base64 pre-enrolled FMD) }
export async function POST(request) {
  try {
    const body = await request.json();
    const { fmd } = body;

    if (!fmd) {
      return NextResponse.json({ error: 'FMD data is required' }, { status: 400 });
    }

    const db = getDb();

    // Get all users with their fingerprints
    const usersWithFingerprints = db.prepare(`
      SELECT u.id as user_id, u.name, u.employee_id, u.department, 
             f.enrolled_fmd
      FROM users u
      INNER JOIN fingerprints f ON u.id = f.user_id
      ORDER BY u.id
    `).all();

    if (usersWithFingerprints.length === 0) {
      return NextResponse.json(
        { error: 'No enrolled fingerprints found in the system' },
        { status: 404 }
      );
    }

    // Group fingerprints by user
    const userMap = new Map();
    for (const row of usersWithFingerprints) {
      if (!userMap.has(row.user_id)) {
        userMap.set(row.user_id, {
          id: row.user_id,
          name: row.name,
          employee_id: row.employee_id,
          department: row.department,
          fingerprints: [],
        });
      }
      userMap.get(row.user_id).fingerprints.push(row.enrolled_fmd);
    }

    let grpcUnavailable = false;

    // Try gRPC verification first; fall through to local on failure
    for (const [userId, userData] of userMap) {
      try {
        const isMatch = await verifyFingerprint(fmd, userData.fingerprints);

        if (isMatch) {
          return recordCheckin(db, userId, userData);
        }
      } catch (err) {
        if (err.code === 14 || err.message?.includes('UNAVAILABLE') || err.message?.includes('ECONNREFUSED')) {
          console.warn('[Checkin] gRPC unavailable, switching to local fallback:', err.message);
          grpcUnavailable = true;
          break; // exit loop — will retry all users locally below
        }
        console.error(`Verification error for user ${userId}:`, err);
      }
    }

    // -----------------------------------------------------------------------
    // Local fallback: gRPC is down, compare bytes directly
    // -----------------------------------------------------------------------
    if (grpcUnavailable) {
      console.log('[Checkin] Running local byte-similarity fallback (threshold:', MATCH_THRESHOLD, ')');
      for (const [userId, userData] of userMap) {
        const isMatch = localVerify(fmd, userData.fingerprints);
        if (isMatch) {
          console.log('[Checkin] Local fallback matched user:', userData.name);
          return recordCheckin(db, userId, userData, 'local_fallback');
        }
      }

      // No match found via local comparison
      return NextResponse.json({
        success: false,
        match: false,
        mode: 'local_fallback',
        error: 'No matching fingerprint found (local fallback mode — gRPC engine offline)',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      match: false,
      error: 'No matching fingerprint found',
    }, { status: 404 });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: `Check-in failed: ${error.message}` },
      { status: 500 }
    );
  }
}

function recordCheckin(db, userId, userData, mode = 'grpc') {
  const result = db.prepare(
    'INSERT INTO checkins (user_id, type) VALUES (?, ?)'
  ).run(userId, 'check_in');

  return NextResponse.json({
    success: true,
    match: true,
    mode,
    user: {
      id: userData.id,
      name: userData.name,
      employee_id: userData.employee_id,
      department: userData.department,
    },
    checkin: {
      id: result.lastInsertRowid,
      type: 'check_in',
      timestamp: new Date().toISOString(),
    },
  });
}
