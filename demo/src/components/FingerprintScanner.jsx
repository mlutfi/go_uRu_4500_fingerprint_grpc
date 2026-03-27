'use client';

import { useState } from 'react';

export default function FingerprintScanner({
  onCapture,
  status = 'idle', // idle | scanning | success | error
  statusText = '',
  hintText = 'Place your finger on the scanner',
  disabled = false,
}) {
  const [fmdInput, setFmdInput] = useState('');
  const [inputMode, setInputMode] = useState('paste'); // paste mode for FMD data

  const handleSubmitFmd = () => {
    if (fmdInput.trim() && onCapture) {
      onCapture(fmdInput.trim());
      setFmdInput('');
    }
  };

  const statusClass = status === 'scanning' ? 'scanning'
    : status === 'success' ? 'success'
    : status === 'error' ? 'error'
    : '';

  const icon = status === 'success' ? '✅'
    : status === 'error' ? '❌'
    : '👆';

  return (
    <div className="scanner-container">
      <div className={`scanner-ring ${statusClass}`}>
        <span className="scanner-icon">{icon}</span>
      </div>

      {statusText && (
        <div className="scanner-status" style={{
          color: status === 'success' ? 'var(--success)' 
               : status === 'error' ? 'var(--danger)'
               : 'var(--text-primary)',
        }}>
          {statusText}
        </div>
      )}

      <div className="scanner-hint">{hintText}</div>

      <div className="fmd-input-section">
        <div style={{ 
          fontSize: '12px', 
          color: 'var(--text-muted)', 
          marginBottom: '8px',
          textAlign: 'center',
        }}>
          Paste Base64 FMD data from fingerprint scanner
        </div>
        <textarea
          className="fmd-textarea"
          placeholder="Paste base64 encoded FMD data here..."
          value={fmdInput}
          onChange={(e) => setFmdInput(e.target.value)}
          disabled={disabled || status === 'scanning'}
          rows={3}
        />
        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={handleSubmitFmd}
            disabled={!fmdInput.trim() || disabled || status === 'scanning'}
          >
            {status === 'scanning' ? (
              <>
                <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                Processing...
              </>
            ) : (
              <>👆 Submit Fingerprint</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
