import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

// GET /api/users — list all users with fingerprint count
export async function GET() {
  try {
    const db = getDb();
    const users = db.prepare(`
      SELECT u.*, COUNT(f.id) as fingerprint_count
      FROM users u
      LEFT JOIN fingerprints f ON u.id = f.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/users — create new user
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, employee_id, department } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const db = getDb();
    const empId = employee_id || `EMP-${Date.now().toString(36).toUpperCase()}`;

    const result = db.prepare(
      'INSERT INTO users (name, employee_id, department) VALUES (?, ?, ?)'
    ).run(name.trim(), empId, department || '');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: 'Employee ID already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
