'use client';

import { useState } from 'react';
import FingerprintScanner from '@/components/FingerprintScanner';

export default function EnrollPage() {
  // Step 1: Create user, Step 2: Enroll fingerprint
  const [step, setStep] = useState('form'); // form | enroll | done
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', employee_id: '', department: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Enrollment state
  const [captures, setCaptures] = useState([]);
  const [captureStep, setCaptureStep] = useState(0); // 0, 1, 2
  const [scanStatus, setScanStatus] = useState('idle');
  const [scanStatusText, setScanStatusText] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollResult, setEnrollResult] = useState(null);

  // Handle create user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setUser(data.user);
      setStep('enroll');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle fingerprint capture
  const handleCapture = (fmdData) => {
    setScanStatus('scanning');
    setScanStatusText('Processing fingerprint...');

    // Simulate processing delay
    setTimeout(() => {
      const newCaptures = [...captures, fmdData];
      setCaptures(newCaptures);
      setCaptureStep(newCaptures.length);
      setScanStatus('success');
      setScanStatusText(`Capture ${newCaptures.length}/3 successful!`);

      // Reset after showing success
      setTimeout(() => {
        if (newCaptures.length < 3) {
          setScanStatus('idle');
          setScanStatusText('');
        }
      }, 1500);
    }, 800);
  };

  // Handle enrollment submission
  const handleEnroll = async () => {
    if (captures.length < 3) return;
    setEnrolling(true);
    setError('');

    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          fmdCandidates: captures,
          fingerName: 'right_index',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Enrollment failed');
      }

      setEnrollResult(data);
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnrolling(false);
    }
  };

  // Reset the entire form
  const handleReset = () => {
    setStep('form');
    setUser(null);
    setFormData({ name: '', employee_id: '', department: '' });
    setCaptures([]);
    setCaptureStep(0);
    setScanStatus('idle');
    setScanStatusText('');
    setEnrollResult(null);
    setError('');
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="page-header">
        <h2>Add User & Enroll Fingerprint</h2>
        <p>Register a new user and capture their fingerprint (3 captures required)</p>
      </div>

      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {/* Step Progress */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '32px',
        padding: '16px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: step === 'form' ? 'var(--accent-primary)' : 'var(--success)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 700, color: 'white',
        }}>
          {step !== 'form' ? '✓' : '1'}
        </div>
        <span style={{ fontSize: '14px', fontWeight: step === 'form' ? 600 : 400, color: step === 'form' ? 'var(--text-primary)' : 'var(--success)' }}>
          User Info
        </span>
        <div style={{ width: '40px', height: '2px', background: step === 'form' ? 'var(--border)' : 'var(--success)' }} />
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: step === 'enroll' ? 'var(--accent-primary)' : step === 'done' ? 'var(--success)' : 'var(--bg-secondary)',
          border: step === 'form' ? '2px solid var(--border)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 700, color: step === 'form' ? 'var(--text-muted)' : 'white',
        }}>
          {step === 'done' ? '✓' : '2'}
        </div>
        <span style={{ fontSize: '14px', fontWeight: step === 'enroll' ? 600 : 400, color: step === 'enroll' ? 'var(--text-primary)' : step === 'done' ? 'var(--success)' : 'var(--text-muted)' }}>
          Fingerprint Enrollment
        </span>
        <div style={{ width: '40px', height: '2px', background: step === 'done' ? 'var(--success)' : 'var(--border)' }} />
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: step === 'done' ? 'var(--success)' : 'var(--bg-secondary)',
          border: step !== 'done' ? '2px solid var(--border)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 700, color: step === 'done' ? 'white' : 'var(--text-muted)',
        }}>
          {step === 'done' ? '✓' : '3'}
        </div>
        <span style={{ fontSize: '14px', fontWeight: step === 'done' ? 600 : 400, color: step === 'done' ? 'var(--success)' : 'var(--text-muted)' }}>
          Complete
        </span>
      </div>

      {/* Step 1: User Form */}
      {step === 'form' && (
        <div className="card" style={{ maxWidth: '560px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>
            👤 User Information
          </h3>
          <form onSubmit={handleCreateUser}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Ahmad Dahir"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Employee ID (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Auto-generated if empty"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Engineering"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                  Creating User...
                </>
              ) : (
                <>Continue to Fingerprint Enrollment →</>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Fingerprint Enrollment */}
      {step === 'enroll' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
                👆 Fingerprint Enrollment
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Enrolling for: <strong style={{ color: 'var(--accent-primary-hover)' }}>{user?.name}</strong>
                {' '}({user?.employee_id})
              </p>
            </div>
            <span className="badge badge-info">Step {Math.min(captureStep + 1, 3)} of 3</span>
          </div>

          {/* Capture Progress Dots */}
          <div className="enroll-steps">
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className={`step-dot ${
                  i < captureStep ? 'done' : i === captureStep && captureStep < 3 ? 'active' : ''
                }`}>
                  {i < captureStep ? '✓' : i + 1}
                </div>
                {i < 2 && (
                  <div className={`step-connector ${i < captureStep ? 'done' : ''}`} />
                )}
              </div>
            ))}
          </div>

          {captures.length < 3 ? (
            <FingerprintScanner
              status={scanStatus}
              statusText={scanStatusText}
              hintText={`Capture ${captureStep + 1} of 3 — Place your finger on the scanner`}
              onCapture={handleCapture}
              disabled={captures.length >= 3}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: 'var(--success)' }}>
                All 3 Captures Complete!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                Ready to enroll fingerprint. This will combine all 3 captures into a single enrolled template.
              </p>
              <button
                className="btn btn-success btn-lg"
                onClick={handleEnroll}
                disabled={enrolling}
              >
                {enrolling ? (
                  <>
                    <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                    Enrolling via gRPC...
                  </>
                ) : (
                  <>🔐 Enroll Fingerprint</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Done */}
      {step === 'done' && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
          <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--success)' }}>
            Enrollment Successful!
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            User <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong> has been enrolled with fingerprint.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '32px' }}>
            Employee ID: {user?.employee_id} · Fingerprint ID: {enrollResult?.fingerprint?.id}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={handleReset}>
              ➕ Add Another User
            </button>
            <a href="/checkin" className="btn btn-outline">
              ✅ Go to Check-in
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
