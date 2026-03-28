'use client';

import { useState, useEffect, useRef } from 'react';
import { getSDK, getQualityLabel } from '@/lib/fingerprint-sdk';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Fingerprint, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

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

  const [sdkAvailable, setSdkAvailable] = useState(null);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [qualityText, setQualityText] = useState('');
  const [fmdInput, setFmdInput] = useState('');
  const [showFallback, setShowFallback] = useState(false);
  const [activeDevice, setActiveDevice] = useState(null);
  const [certError, setCertError] = useState(false);
  const sdkRef = useRef(null);
  const mountedRef = useRef(true);

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

      sdk.on('DeviceConnected', (event) => {
        if (mountedRef.current) setDeviceConnected(true);
      });

      sdk.on('DeviceDisconnected', (event) => {
        if (mountedRef.current) {
          setDeviceConnected(false);
          setCapturing(false);
        }
      });

      sdk.on('QualityReported', (event) => {
        const label = getQualityLabel(event.quality);
        if (mountedRef.current) setQualityText(label);
      });

      sdk.on('SamplesAcquired', (event) => {
        if (!mountedRef.current) return;
        if (event.samples && event.samples.length > 0) {
          const bioSample = event.samples[0];
          const rawData = typeof bioSample === 'string' ? bioSample : bioSample.Data;
          if (rawData && onCaptureRef.current) {
            const base64 = base64UrlToBase64(rawData);
            onCaptureRef.current(base64);
          }
        }
      });

      sdk.on('AcquisitionStarted', () => {
        if (mountedRef.current) setCapturing(true);
      });

      sdk.on('AcquisitionStopped', () => {
        if (mountedRef.current) setCapturing(false);
      });

      sdk.on('CommunicationFailed', () => {
        if (mountedRef.current) {
          setSdkAvailable(false);
          setShowFallback(true);
        }
      });

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

  useEffect(() => {
    if (!autoStart || disabled || !sdkAvailable || !deviceConnected) return;
    const sdk = sdkRef.current;
    if (!sdk || !sdk.isAvailable()) return;
    if (sdk.isCapturing) return;

    sdk.startCapture().catch(() => {});

    return () => {
      if (sdk.isCapturing) {
        sdk.stopCapture();
      }
    };
  }, [autoStart, disabled, sdkAvailable, deviceConnected]);

  useEffect(() => {
    const sdk = sdkRef.current;
    if (!sdk) return;

    const handleDeviceChange = async (newDeviceUid) => {
      if (!mountedRef.current) return;
      setActiveDevice(newDeviceUid);
      if (sdk.isCapturing) {
        await sdk.stopCapture();
      }
      if (autoStart && !disabled && sdkAvailable && deviceConnected) {
        await sdk.startCapture();
      }
    };

    sdk.onSelectedDeviceChange(handleDeviceChange);
    return () => sdk.offSelectedDeviceChange(handleDeviceChange);
  }, [autoStart, disabled, sdkAvailable, deviceConnected]);

  const handleSubmitFmd = () => {
    if (fmdInput.trim() && onCapture) {
      onCapture(fmdInput.trim());
      setFmdInput('');
    }
  };

  const isScanning = status === 'scanning' || capturing;
  const isSuccess = status === 'success';
  const isError = status === 'error';

  let displayHint = hintText;
  if (sdkAvailable === null) {
    displayHint = 'Initializing scanner...';
  } else if (sdkAvailable && !deviceConnected) {
    displayHint = 'Connect your U.are.U 4500 scanner to proceed';
  } else if (!sdkAvailable) {
    displayHint = 'WebSDK not available — use manual input below';
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 w-full">
      {/* Scanner Visual Container */}
      <div 
        className={`relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 transition-all duration-300 ${
          isSuccess ? 'border-green-500 bg-green-500/10' :
          isError ? 'border-destructive bg-destructive/10' :
          isScanning ? 'border-primary ring-4 ring-primary/20 bg-primary/5' :
          'border-muted-foreground/30 bg-muted/20'
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 className="h-14 w-14 text-green-500 animate-in zoom-in duration-300" />
        ) : isError ? (
          <XCircle className="h-14 w-14 text-destructive animate-in zoom-in duration-300" />
        ) : (
          <Fingerprint className={`h-16 w-16 transition-colors duration-300 ${
            isScanning ? 'text-primary' : 'text-muted-foreground/30'
          }`} />
        )}

        {/* Scan Line Animation */}
        {(isScanning) && !isSuccess && !isError && (
          <div className="absolute top-0 left-0 h-full w-full">
            <div className="h-1.5 w-full bg-primary/80 blur-[2px] shadow-[0_0_12px_rgba(var(--primary),0.8)] animate-scan-line" />
          </div>
        )}
      </div>

      {/* Processing Status */}
      {status === 'scanning' && (
        <div className="mt-6 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm text-foreground animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="font-medium">{statusText || 'Reading fingerprint...'}</span>
        </div>
      )}

      {/* Success/Error Text */}
      {isSuccess && statusText && (
        <div className="mt-6 flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/15 px-3 py-1.5 text-sm font-medium text-green-600 dark:text-green-400 animate-in slide-in-from-bottom-2">
           {statusText}
        </div>
      )}
      
      {isError && statusText && (
        <div className="mt-6 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/15 px-3 py-1.5 text-sm font-medium text-destructive animate-in slide-in-from-bottom-2">
           {statusText}
        </div>
      )}

      {/* Quality Text */}
      {qualityText && !isScanning && !isSuccess && (
        <div className="mt-4 text-sm font-medium text-amber-500">
          {qualityText}
        </div>
      )}

      {/* Hint */}
      <div className="mt-4 text-center text-sm font-medium text-muted-foreground">
        {displayHint}
      </div>

      {/* Device Indicator */}
      {sdkAvailable && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <span className={`h-1.5 w-1.5 rounded-full ${deviceConnected ? 'bg-green-500' : 'bg-destructive'}`} />
          {deviceConnected ? (
            <span>Scanner ready <span className="font-semibold text-foreground tracking-tight">· {activeDevice ? 'Selected' : 'Default'}</span></span>
          ) : 'Scanner not detected'}
        </div>
      )}

      {/* Cert Error */}
      {certError && (
        <div className="mt-4 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs leading-relaxed text-yellow-600 dark:text-yellow-500">
          <strong className="block mb-1 font-semibold">⚠ Certificate not trusted</strong>
          DpHost uses a self-signed HTTPS certificate. Open{' '}
          <a href="https://127.0.0.1:52181/get_connection" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">
            https://127.0.0.1:52181
          </a>{' '}
          in your browser, accept the certificate, then reload this page.
        </div>
      )}

      {/* Manual Fallback */}
      {(showFallback || !sdkAvailable) && sdkAvailable !== null && (
        <div className="mt-6 w-full max-w-sm">
          <div className="relative mb-4 text-center">
            <span className="bg-background px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Or manual input</span>
            <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
          </div>
          
          <Textarea
            placeholder="Paste base64 encoded FMD data here..."
            className="min-h-[80px] font-mono text-xs"
            value={fmdInput}
            onChange={(e) => setFmdInput(e.target.value)}
            disabled={disabled || isScanning}
          />
          <Button
            className="mt-3 w-full"
            onClick={handleSubmitFmd}
            disabled={!fmdInput.trim() || disabled || isScanning}
          >
            {isScanning ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              'Submit Fingerprint'
            )}
          </Button>
        </div>
      )}

      {sdkAvailable && !showFallback && (
        <Button
          variant="link"
          className="mt-4 h-auto p-0 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => setShowFallback(true)}
        >
          Use manual input mode &rarr;
        </Button>
      )}

      {/* Custom CSS for scan line animation inside tailwind flow */}
      <style jsx>{`
        @keyframes scanLine {
          0% { transform: translateY(-3rem); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(3rem); opacity: 0; }
        }
        .animate-scan-line {
          animation: scanLine 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}

function base64UrlToBase64(base64url) {
  if (!base64url || typeof base64url !== 'string') return base64url;
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad === 2) base64 += '==';
  else if (pad === 3) base64 += '=';
  return base64;
}
