'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <span>Loading users...</span>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h2>Users</h2>
          <p>All registered users and their fingerprint status</p>
        </div>
        <Link href="/enroll" className="btn btn-primary">
          ➕ Add User
        </Link>
      </div>

      {error && (
        <div className="alert alert-error">❌ {error}</div>
      )}

      {users.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No users registered</h3>
            <p style={{ fontSize: '13px', marginBottom: '20px' }}>
              Add your first user and enroll their fingerprint.
            </p>
            <Link href="/enroll" className="btn btn-primary">
              👆 Add User & Enroll
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            marginBottom: '24px',
            fontSize: '13px',
            color: 'var(--text-muted)',
          }}>
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>{users.length}</strong> users registered
            </span>
            <span>·</span>
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>
                {users.filter(u => u.fingerprint_count > 0).length}
              </strong> with fingerprints
            </span>
          </div>

          {/* Users Grid */}
          <div className="users-grid">
            {users.map((user) => (
              <div key={user.id} className="user-card">
                <div className="user-avatar">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
                <h3>{user.name}</h3>
                <div className="user-meta">
                  {user.employee_id}
                  {user.department ? ` · ${user.department}` : ''}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {user.fingerprint_count > 0 ? (
                    <span className="badge badge-success">
                      👆 {user.fingerprint_count} fingerprint{user.fingerprint_count > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="badge badge-warning">
                      ⚠️ No fingerprint
                    </span>
                  )}
                </div>
                <div className="user-stats">
                  <div className="user-stat-item">
                    <span>{user.fingerprint_count || 0}</span>
                    Fingerprints
                  </div>
                  <div className="user-stat-item">
                    <span style={{ fontSize: '12px' }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                    Registered
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
