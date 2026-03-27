import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { verifyFingerprint } from '@/lib/grpc-client';

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

    // Try gRPC verification first, fall back to simple string matching
    let verificationMode = 'grpc';

    for (const [userId, userData] of userMap) {
      try {
        let isMatch = false;

        try {
          isMatch = await verifyFingerprint(fmd, userData.fingerprints);
        } catch (grpcErr) {
          // gRPC server unavailable — fallback to direct FMD string comparison
          // This works when enrollment also used local_fallback mode
          verificationMode = 'local_fallback';
          isMatch = userData.fingerprints.some(enrolled => enrolled === fmd);
        }
        
        if (isMatch) {
          // Record check-in
          const result = db.prepare(
            'INSERT INTO checkins (user_id, type) VALUES (?, ?)'
          ).run(userId, 'check_in');

          return NextResponse.json({
            success: true,
            match: true,
            verificationMode,
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
      } catch (err) {
        console.error(`Verification error for user ${userId}:`, err);
        continue;
      }
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
