'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSDK } from '@/lib/fingerprint-sdk';

export default function DeviceStatus({ compact = false }) {
  const [status, setStatus] = useState('initializing');
  const [devices, setDevices] = useState([]); // array of device UIDs
  const [selectedDevice, setSelectedDevice] = useState(null);
  const sdkRef = useRef(null);
  const mountedRef = useRef(true);

  // Refresh device list
  const refreshDevices = useCallback(async () => {
    const sdk = sdkRef.current;
    if (!sdk || !sdk.isAvailable()) return;

    try {
      const list = await sdk.getDeviceList();
      if (!mountedRef.current) return;

      setDevices(list || []);
      const saved = sdk.getSelectedDevice();

      if (list.length > 0) {
        setStatus('connected');
        // If saved device is still in the list, keep it; otherwise auto-select first
        if (saved && list.includes(saved)) {
          setSelectedDevice(saved);
        } else {
          // Auto-select first device and persist
          sdk.setSelectedDevice(list[0]);
          setSelectedDevice(list[0]);
        }
      } else {
        setStatus('disconnected');
        setSelectedDevice(null);
      }
    } catch {
      if (mountedRef.current) setStatus('no-sdk');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    async function initSDK() {
      const sdk = getSDK();
      sdkRef.current = sdk;

      const ready = await sdk.init();
      if (!mountedRef.current) return;

      if (!ready) {
        setStatus('no-sdk');
        return;
      }

      // Listen for device connect/disconnect to refresh list
      sdk.on('DeviceConnected', () => {
        if (mountedRef.current) refreshDevices();
      });

      sdk.on('DeviceDisconnected', () => {
        if (mountedRef.current) refreshDevices();
      });

      sdk.on('CommunicationFailed', () => {
        if (mountedRef.current) setStatus('no-sdk');
      });

      // Initial device enumeration
      refreshDevices();
    }

    initSDK();

    return () => {
      mountedRef.current = false;
    };
  }, [refreshDevices]);

  // Handle device selection change
  const handleDeviceChange = (e) => {
    const uid = e.target.value;
    const sdk = sdkRef.current;
    if (sdk) {
      sdk.setSelectedDevice(uid || null);
    }
    setSelectedDevice(uid || null);
  };

  const statusConfig = {
    initializing: {
      color: 'var(--warning)',
      bg: 'var(--warning-bg)',
      border: 'rgba(245, 158, 11, 0.2)',
      label: 'Initializing...',
      pulse: false,
    },
    connected: {
      color: 'var(--success)',
      bg: 'var(--success-bg)',
      border: 'rgba(34, 197, 94, 0.3)',
      label: `${devices.length} Reader${devices.length > 1 ? 's' : ''} Connected`,
      pulse: true,
    },
    disconnected: {
      color: 'var(--danger)',
      bg: 'var(--danger-bg)',
      border: 'rgba(239, 68, 68, 0.2)',
      label: 'No Reader Found',
      pulse: false,
    },
    'no-sdk': {
      color: 'var(--text-muted)',
      bg: 'var(--bg-secondary)',
      border: 'var(--border)',
      label: 'DpHost Not Running',
      pulse: false,
    },
  };

  const cfg = statusConfig[status] || statusConfig.disconnected;

  if (compact) {
    return (
      <div className="device-status-compact" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: 'var(--radius-sm)',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}>
        <span className={`device-dot ${cfg.pulse ? 'pulse' : ''}`} style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: cfg.color,
          display: 'inline-block',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: '12px', color: cfg.color, fontWeight: 600 }}>
          {cfg.label}
        </span>
      </div>
    );
  }

  // Short label for device UID
  const shortUid = (uid) => {
    if (!uid || typeof uid !== 'string') return String(uid);
    if (uid.length <= 12) return uid;
    return uid.substring(0, 8) + '…' + uid.substring(uid.length - 4);
  };

  return (
    <div className="device-status-card" style={{
      padding: '16px',
      borderRadius: 'var(--radius-md)',
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      transition: 'all 0.3s ease',
    }}>
      {/* Status header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: status === 'connected' ? '12px' : '8px' }}>
        <span className={`device-dot-lg ${cfg.pulse ? 'pulse' : ''}`} style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: cfg.color,
          display: 'inline-block',
          flexShrink: 0,
          boxShadow: cfg.pulse ? `0 0 8px ${cfg.color}` : 'none',
        }} />
        <span style={{ fontSize: '14px', color: cfg.color, fontWeight: 600 }}>
          {cfg.label}
        </span>
      </div>

      {/* Device selector — shown when connected */}
      {status === 'connected' && devices.length > 0 && (
        <div style={{ paddingLeft: '24px' }}>
          <label style={{ 
            fontSize: '10px', 
            color: 'var(--text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            fontWeight: 600,
            marginBottom: '4px',
            display: 'block',
          }}>
            Active Reader
          </label>
          <select
            value={selectedDevice || ''}
            onChange={handleDeviceChange}
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'auto',
            }}
          >
            {devices.map((uid, i) => (
              <option key={uid} value={uid}>
                Reader {i + 1} — {shortUid(uid)}
              </option>
            ))}
          </select>
          {selectedDevice && (
            <div style={{ 
              fontSize: '9px', 
              color: 'var(--text-muted)', 
              marginTop: '4px', 
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}>
              {selectedDevice}
            </div>
          )}
        </div>
      )}

      {status === 'no-sdk' && (
        <div style={{ paddingLeft: '24px', fontSize: '11px', color: 'var(--text-muted)' }}>
          Start the DigitalPersona Agent service.
          <br />
          Fallback: manual FMD input available.
        </div>
      )}
      {status === 'disconnected' && (
        <div style={{ paddingLeft: '24px', fontSize: '11px', color: 'var(--text-muted)' }}>
          Connect your U.are.U 4500 scanner via USB.
        </div>
      )}
    </div>
  );
}
