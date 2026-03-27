'use client';

import { useState, useEffect } from 'react';
import FingerprintScanner from '@/components/FingerprintScanner';

export default function CheckinPage() {
  const [scanStatus, setScanStatus] = useState('idle');
  const [scanStatusText, setScanStatusText] = useState('');
  const [result, setResult] = useState(null); // { success, user, checkin } or { error }
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch recent check-ins
  useEffect(() => {
    async function fetchCheckins() {
      try {
        const res = await fetch('/api/checkins?limit=10');
        const data = await res.json();
        setRecentCheckins(data.checkins || []);
      } catch (err) {
        console.error('Failed to fetch check-ins:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCheckins();
  }, []);

  const handleCapture = async (fmdData) => {
    setScanStatus('scanning');
    setScanStatusText('Verifying fingerprint...');
    setResult(null);

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fmd: fmdData }),
      });

      const data = await res.json();

      if (data.match) {
        setScanStatus('success');
        setScanStatusText('Fingerprint matched!');
        setResult({ success: true, user: data.user, checkin: data.checkin });

        // Refresh recent check-ins
        const checkinsRes = await fetch('/api/checkins?limit=10');
        const checkinsData = await checkinsRes.json();
        setRecentCheckins(checkinsData.checkins || []);
      } else {
        setScanStatus('error');
        setScanStatusText('No matching fingerprint found');
        setResult({ success: false, error: data.error || 'No match found' });
      }
    } catch (err) {
      setScanStatus('error');
      setScanStatusText('Verification failed');
      setResult({ success: false, error: err.message });
    }

    // Reset scanner after delay
    setTimeout(() => {
      setScanStatus('idle');
      setScanStatusText('');
    }, 5000);
  };

  const handleReset = () => {
    setScanStatus('idle');
    setScanStatusText('');
    setResult(null);
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="page-header">
        <h2>Fingerprint Check-in</h2>
        <p>Place your finger on the scanner to check in</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Scanner Panel */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            🔍 Scan Fingerprint
          </h3>

          <FingerprintScanner
            status={scanStatus}
            statusText={scanStatusText}
            hintText="Place your finger on the scanner to check in"
            onCapture={handleCapture}
            autoStart={true}
          />

          {/* Result Display */}
          {result && (
            <div className="checkin-result" style={{ marginTop: '8px' }}>
              {result.success ? (
                <div style={{ 
                  background: 'var(--success-bg)', 
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                }}>
                  <div className="checkin-result-icon">🎉</div>
                  <h3 style={{ color: 'var(--success)' }}>Welcome, {result.user?.name}!</h3>
                  <p>Employee ID: {result.user?.employee_id}</p>
                  {result.user?.department && (
                    <p>Department: {result.user.department}</p>
                  )}
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>
                    Checked in at {new Date(result.checkin?.timestamp).toLocaleTimeString()}
                  </p>
                  <button className="btn btn-outline btn-sm mt-4" onClick={handleReset}>
                    Scan Another
                  </button>
                </div>
              ) : (
                <div style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                }}>
                  <div className="checkin-result-icon">❌</div>
                  <h3 style={{ color: 'var(--danger)' }}>Not Recognized</h3>
                  <p>{result.error}</p>
                  <button className="btn btn-outline btn-sm mt-4" onClick={handleReset}>
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Check-ins */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            🕐 Today&apos;s Check-ins
          </h3>

          {loading ? (
            <div className="loading-overlay" style={{ padding: '20px' }}>
              <div className="spinner" />
            </div>
          ) : recentCheckins.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">📋</div>
              <h3>No check-ins yet</h3>
              <p style={{ fontSize: '13px' }}>Scan a fingerprint to record the first check-in</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentCheckins.map((ci, idx) => (
                <div
                  key={ci.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: idx === 0 && result?.success ? 'var(--success-bg)' : 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    border: idx === 0 && result?.success ? '1px solid rgba(34, 197, 94, 0.2)' : 'none',
                    animation: idx === 0 ? 'slideIn 0.3s ease' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent-primary), #a78bfa)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '15px', fontWeight: 700, color: 'white',
                    }}>
                      {ci.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{ci.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {ci.employee_id} {ci.department ? `· ${ci.department}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      {new Date(ci.created_at).toLocaleTimeString()}
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 6px' }}>
                      ✓ Checked in
                    </span>
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
