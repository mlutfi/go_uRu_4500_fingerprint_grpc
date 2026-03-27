import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

// GET /api/checkins — list recent check-ins
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const db = getDb();
    const checkins = db.prepare(`
      SELECT c.id, c.type, c.created_at, 
             u.id as user_id, u.name, u.employee_id, u.department
      FROM checkins c
      INNER JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
      LIMIT ?
    `).all(limit);

    // Get today's check-in count
    const todayCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM checkins
      WHERE date(created_at) = date('now')
    `).get();

    return NextResponse.json({
      checkins,
      todayCount: todayCount.count,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
