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

    // Call gRPC to enroll fingerprint
    const enrolledFmd = await enrollFingerprint(fmdCandidates);

    if (!enrolledFmd) {
      return NextResponse.json(
        { error: 'Failed to enroll fingerprint. Please try again.' },
        { status: 500 }
      );
    }

    // Save enrolled FMD to database
    const result = db.prepare(
      'INSERT INTO fingerprints (user_id, enrolled_fmd, finger_name) VALUES (?, ?, ?)'
    ).run(userId, enrolledFmd, fingerName || 'right_index');

    return NextResponse.json({
      success: true,
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
