import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { enrollFingerprint } from '@/lib/grpc-client';

// POST /api/enroll — enroll fingerprint for user
// Body: { userId: number, fmdCandidates: string[], fingerName?: string }
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, fmdCandidates, fingerName } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!fmdCandidates || !Array.isArray(fmdCandidates) || fmdCandidates.length < 3) {
      return NextResponse.json(
        { error: 'At least 3 FMD candidates are required for enrollment' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify user exists
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let enrolledFmd = null;
    let enrollmentMode = 'grpc';

    // Try gRPC enrollment first
    try {
      enrolledFmd = await enrollFingerprint(fmdCandidates);
    } catch (grpcErr) {
      console.warn('[Enroll] gRPC enrollment failed, using local fallback:', grpcErr.message);
      // Fallback: store the first captured FMD directly as the enrolled template
      const firstFmd = fmdCandidates[0];
      // Handle case where FMD is a BioSample object { Header, Data } instead of a string
      enrolledFmd = typeof firstFmd === 'string' ? firstFmd : (firstFmd?.Data || JSON.stringify(firstFmd));
      enrollmentMode = 'local_fallback';
    }

    if (!enrolledFmd) {
      return NextResponse.json(
        { error: 'Failed to enroll fingerprint. Please try again.' },
        { status: 500 }
      );
    }

    // Ensure enrolledFmd is a string for SQLite
    if (typeof enrolledFmd !== 'string') {
      enrolledFmd = JSON.stringify(enrolledFmd);
    }

    console.log('[Enroll] Saving FMD, mode:', enrollmentMode, ', length:', enrolledFmd.length);

    // Save enrolled FMD to database
    const result = db.prepare(
      'INSERT INTO fingerprints (user_id, enrolled_fmd, finger_name) VALUES (?, ?, ?)'
    ).run(userId, enrolledFmd, fingerName || 'right_index');

    return NextResponse.json({
      success: true,
      enrollmentMode,
      fingerprint: {
        id: result.lastInsertRowid,
        user_id: userId,
        finger_name: fingerName || 'right_index',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Enrollment error:', error);
    return NextResponse.json(
      { error: `Enrollment failed: ${error.message}` },
      { status: 500 }
    );
  }
}
