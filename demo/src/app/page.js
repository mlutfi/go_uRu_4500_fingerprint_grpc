'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalFingerprints: 0,
    todayCheckins: 0,
    recentCheckins: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [usersRes, checkinsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/checkins?limit=10'),
        ]);

        const usersData = await usersRes.json();
        const checkinsData = await checkinsRes.json();

        const totalFingerprints = (usersData.users || []).reduce(
          (sum, u) => sum + (u.fingerprint_count || 0), 0
        );

        setStats({
          totalUsers: (usersData.users || []).length,
          totalFingerprints,
          todayCheckins: checkinsData.todayCount || 0,
          recentCheckins: checkinsData.checkins || [],
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Fingerprint biometric system overview</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">👆</div>
          <div className="stat-value">{stats.totalFingerprints}</div>
          <div className="stat-label">Enrolled Fingerprints</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats.todayCheckins}</div>
          <div className="stat-label">Today&apos;s Check-ins</div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon">🔗</div>
          <div className="stat-value" style={{ fontSize: '18px' }}>localhost:4134</div>
          <div className="stat-label">gRPC Server</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Quick Actions */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
            ⚡ Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link href="/enroll" className="btn btn-primary" style={{ justifyContent: 'flex-start' }}>
              👆 Add User & Enroll Fingerprint
            </Link>
            <Link href="/checkin" className="btn btn-success" style={{ justifyContent: 'flex-start' }}>
              ✅ Fingerprint Check-in
            </Link>
            <Link href="/users" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
              👥 View All Users
            </Link>
          </div>
        </div>

        {/* Recent Check-ins */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
            🕐 Recent Check-ins
          </h3>
          {stats.recentCheckins.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              <div className="empty-state-icon">📋</div>
              <p style={{ fontSize: '13px' }}>No check-ins yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.recentCheckins.slice(0, 5).map((ci) => (
                <div key={ci.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent-primary), #a78bfa)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'white',
                    }}>
                      {ci.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{ci.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ci.employee_id}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(ci.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
