'use client';

import { useState, useEffect, useRef } from 'react';
import { getSDK, getQualityLabel } from '@/lib/fingerprint-sdk';

export default function FingerprintScanner({
  onCapture,
  status = 'idle', // idle | scanning | success | error
  statusText = '',
  hintText = 'Place your finger on the scanner',
  disabled = false,
  autoStart = true,
}) {
  const onCaptureRef = useRef(onCapture);
  useEffect(() => { onCaptureRef.current = onCapture; }, [onCapture]);

  const [sdkAvailable, setSdkAvailable] = useState(null); // null = checking, true/false
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [qualityText, setQualityText] = useState('');
  const [fmdInput, setFmdInput] = useState('');
  const [showFallback, setShowFallback] = useState(false);
  const [activeDevice, setActiveDevice] = useState(null);
  const [certError, setCertError] = useState(false);
  const sdkRef = useRef(null);
  const mountedRef = useRef(true);

  // Initialize SDK and register event handlers
  useEffect(() => {
    mountedRef.current = true;

    async function setup() {
      const sdk = getSDK();
      sdkRef.current = sdk;

      const ready = await sdk.init();

      if (!mountedRef.current) return;

      setSdkAvailable(ready);

      if (!ready) {
        setShowFallback(true);
        if (sdk.hasCertError()) setCertError(true);
        return;
      }

      // Event: Device Connected
      sdk.on('DeviceConnected', (event) => {
        console.log('[Scanner] Device connected:', event.deviceId);
        if (mountedRef.current) setDeviceConnected(true);
      });

      // Event: Device Disconnected
      sdk.on('DeviceDisconnected', (event) => {
        console.log('[Scanner] Device disconnected:', event.deviceId);
        if (mountedRef.current) {
          setDeviceConnected(false);
          setCapturing(false);
        }
      });

      // Event: Quality Reported
      sdk.on('QualityReported', (event) => {
        const label = getQualityLabel(event.quality);
        console.log('[Scanner] Quality:', label);
        if (mountedRef.current) setQualityText(label);
      });

      // Event: Samples Acquired — this is the main capture event
      sdk.on('SamplesAcquired', (event) => {
        console.log('[Scanner] Samples acquired, format:', event.sampleFormat);
        if (!mountedRef.current) return;

        // event.samples is an array of BioSample objects: { Header, Data, Version }
        // Data is the Base64Url-encoded FMD string we need
        if (event.samples && event.samples.length > 0) {
          const bioSample = event.samples[0];
          // Extract the Data field (Base64Url string) from the BioSample object
          const rawData = typeof bioSample === 'string' ? bioSample : bioSample.Data;
          console.log('[Scanner] Sample data type:', typeof bioSample, '| Data length:', rawData?.length);
          if (rawData && onCaptureRef.current) {
            const base64 = base64UrlToBase64(rawData);
            onCaptureRef.current(base64);
          }
        }
      });

      // Event: Error
      sdk.on('ErrorOccurred', (event) => {
        console.error('[Scanner] Error:', event.error);
      });

      // Events: Acquisition lifecycle
      sdk.on('AcquisitionStarted', (event) => {
        console.log('[Scanner] Acquisition STARTED on device:', event.deviceId);
        if (mountedRef.current) setCapturing(true);
      });

      sdk.on('AcquisitionStopped', (event) => {
        console.log('[Scanner] Acquisition STOPPED on device:', event.deviceId);
        if (mountedRef.current) setCapturing(false);
      });

      // Event: Communication Failed (WebSdk channel down)
      sdk.on('CommunicationFailed', () => {
        console.error('[Scanner] Communication with DpHost failed');
        if (mountedRef.current) {
          setSdkAvailable(false);
          setShowFallback(true);
        }
      });

      // Check for currently connected devices
      sdk.getDeviceList().then(devices => {
        if (!mountedRef.current) return;
        if (devices.length > 0) {
          setDeviceConnected(true);
          setActiveDevice(sdk.getSelectedDevice());
        }
      }).catch(() => {
        if (mountedRef.current) {
          setSdkAvailable(false);
          setShowFallback(true);
        }
      });
    }

    setup();

    return () => {
      mountedRef.current = false;
      const sdk = sdkRef.current;
      if (sdk) {
        if (sdk.isCapturing) sdk.stopCapture();
        sdk.off('DeviceConnected');
        sdk.off('DeviceDisconnected');
        sdk.off('QualityReported');
        sdk.off('SamplesAcquired');
        sdk.off('ErrorOccurred');
        sdk.off('AcquisitionStarted');
        sdk.off('AcquisitionStopped');
        sdk.off('CommunicationFailed');
      }
    };
  }, []);

  // Auto-start capture when device is ready.
  // This effect starts capture ONCE and doesn't re-run when capturing changes.
  // Cleanup only stops capture on unmount or when conditions become invalid.
  useEffect(() => {
    if (!autoStart || disabled || !sdkAvailable || !deviceConnected) return;

    const sdk = sdkRef.current;
    if (!sdk || !sdk.isAvailable()) return;

    // Don't start if already capturing
    if (sdk.isCapturing) return;

    console.log('[Scanner] Auto-starting capture...');
    sdk.startCapture().then(ok => {
      console.log('[Scanner] startCapture result:', ok);
    });

    // Only stop when component unmounts or device/sdk conditions change
    // NOT when status changes — capture must stay alive across enrollment steps
    return () => {
      if (sdk.isCapturing) {
        console.log('[Scanner] Stopping capture: conditions changed or unmounting');
        sdk.stopCapture();
      }
    };

  }, [autoStart, disabled, sdkAvailable, deviceConnected]);

  // Restart capture when selected device changes in the sidebar
  useEffect(() => {
    const sdk = sdkRef.current;
    if (!sdk) return;

    const handleDeviceChange = async (newDeviceUid) => {
      if (!mountedRef.current) return;
      setActiveDevice(newDeviceUid);
      // Stop current capture and restart on new device
      if (sdk.isCapturing) {
        await sdk.stopCapture();
      }
      if (autoStart && !disabled && sdkAvailable && deviceConnected) {
        console.log('[Scanner] Restarting capture on new device:', newDeviceUid);
        await sdk.startCapture();
      }
    };

    sdk.onSelectedDeviceChange(handleDeviceChange);
    return () => sdk.offSelectedDeviceChange(handleDeviceChange);
  }, [autoStart, disabled, sdkAvailable, deviceConnected]);

  // Fallback: manual FMD paste
  const handleSubmitFmd = () => {
    if (fmdInput.trim() && onCapture) {
      onCapture(fmdInput.trim());
      setFmdInput('');
    }
  };

  const statusClass = status === 'scanning' ? 'scanning'
    : status === 'success' ? 'success'
    : status === 'error' ? 'error'
    : capturing ? 'scanning'
    : '';

  const icon = status === 'success' ? '✅'
    : status === 'error' ? '❌'
    : '👆';

  // Determine instructional text
  let displayHint = hintText;
  if (sdkAvailable === null) {
    displayHint = 'Initializing scanner...';
  } else if (sdkAvailable && !deviceConnected) {
    displayHint = 'Connect your U.are.U 4500 scanner to proceed';
  } else if (sdkAvailable && deviceConnected && capturing && status === 'idle') {
    displayHint = hintText;
  } else if (!sdkAvailable) {
    displayHint = 'WebSDK not available — use manual input below';
  }

  return (
    <div className="scanner-container">
      {/* Scanner Visual */}
      <div className={`scanner-ring ${statusClass}`}>
        <span className="scanner-icon">{icon}</span>
        {(capturing || status === 'scanning') && (
          <div className="scanner-line" />
        )}
      </div>

      {/* Status Text */}
      {(statusText || qualityText) && (
        <div className="scanner-status" style={{
          color: status === 'success' ? 'var(--success)' 
               : status === 'error' ? 'var(--danger)'
               : 'var(--text-primary)',
        }}>
          {statusText || qualityText}
        </div>
      )}

      {/* Hint */}
      <div className="scanner-hint">{displayHint}</div>

      {/* Device indicator */}
      {sdkAvailable && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          marginTop: '12px',
          fontSize: '11px',
          color: deviceConnected ? 'var(--success)' : 'var(--text-muted)',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: deviceConnected ? 'var(--success)' : 'var(--danger)',
            display: 'inline-block',
          }} />
          {deviceConnected ? (
            <>
              Scanner ready — listening on{' '}
              <span style={{ fontWeight: 600 }}>
                {activeDevice ? 'selected reader' : 'default reader'}
              </span>
            </>
          ) : 'Scanner not detected'}
        </div>
      )}

      {/* Cert trust hint */}
      {certError && (
        <div style={{
          marginTop: '12px',
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          fontSize: '12px',
          lineHeight: '1.5',
          color: 'var(--warning)',
        }}>
          <strong>⚠ Certificate not trusted</strong>
          <br />
          DpHost uses a self-signed HTTPS certificate. Open{' '}
          <a
            href="https://127.0.0.1:52181/get_connection"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
          >
            https://127.0.0.1:52181
          </a>{' '}
          in your browser, accept the certificate, then reload this page.
        </div>
      )}

      {/* Fallback: Manual FMD Input */}
      {(showFallback || !sdkAvailable) && sdkAvailable !== null && (
        <div className="fmd-input-section">
          <div style={{ 
            fontSize: '11px', 
            color: 'var(--text-muted)', 
            marginBottom: '8px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}>
            <div style={{ width: '32px', height: '1px', background: 'var(--border)' }} />
            <span>or paste Base64 FMD data</span>
            <div style={{ width: '32px', height: '1px', background: 'var(--border)' }} />
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
      )}

      {/* Toggle fallback when SDK is available */}
      {sdkAvailable && !showFallback && (
        <button
          onClick={() => setShowFallback(true)}
          style={{
            marginTop: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '11px',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontFamily: 'inherit',
          }}
        >
          Manual input mode →
        </button>
      )}
    </div>
  );
}

/**
 * Convert Base64Url to standard Base64
 * The @digitalpersona SDK uses Base64Url encoding
 */
function base64UrlToBase64(base64url) {
  if (!base64url || typeof base64url !== 'string') return base64url;
  // Replace URL-safe characters
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding
  const pad = base64.length % 4;
  if (pad === 2) base64 += '==';
  else if (pad === 3) base64 += '=';
  return base64;
}
