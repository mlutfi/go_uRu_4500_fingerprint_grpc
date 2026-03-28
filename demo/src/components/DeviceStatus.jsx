'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSDK } from '@/lib/fingerprint-sdk';
import { Badge } from '@/components/ui/badge';

export default function DeviceStatus({ compact = false }) {
  const [status, setStatus] = useState('initializing');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const sdkRef = useRef(null);
  const mountedRef = useRef(true);

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
        if (saved && list.includes(saved)) {
          setSelectedDevice(saved);
        } else {
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

      sdk.on('DeviceConnected', () => {
        if (mountedRef.current) refreshDevices();
      });

      sdk.on('DeviceDisconnected', () => {
        if (mountedRef.current) refreshDevices();
      });

      sdk.on('CommunicationFailed', () => {
        if (mountedRef.current) setStatus('no-sdk');
      });

      refreshDevices();
    }

    initSDK();

    return () => {
      mountedRef.current = false;
    };
  }, [refreshDevices]);

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
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      badgeVar: 'outline',
      label: 'Initializing...',
      pulse: false,
    },
    connected: {
      color: 'bg-green-500',
      textColor: 'text-green-700 dark:text-green-400',
      badgeVar: 'default',
      label: `${devices.length} Reader${devices.length > 1 ? 's' : ''}`,
      pulse: true,
    },
    disconnected: {
      color: 'bg-red-500',
      textColor: 'text-red-700 dark:text-red-400',
      badgeVar: 'destructive',
      label: 'No Reader',
      pulse: false,
    },
    'no-sdk': {
      color: 'bg-muted-foreground',
      textColor: 'text-muted-foreground',
      badgeVar: 'secondary',
      label: 'DpHost Not Running',
      pulse: false,
    },
  };

  const cfg = statusConfig[status] || statusConfig.disconnected;

  if (compact) {
    return (
      <Badge variant={cfg.badgeVar} className="flex w-fit items-center gap-1.5 py-0.5 px-2">
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.pulse ? 'animate-pulse' : ''} ${cfg.color}`} />
        <span className="text-[11px] font-medium">{cfg.label}</span>
      </Badge>
    );
  }

  const shortUid = (uid) => {
    if (!uid || typeof uid !== 'string') return String(uid);
    if (uid.length <= 12) return uid;
    return uid.substring(0, 8) + '…' + uid.substring(uid.length - 4);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.pulse ? 'animate-pulse' : ''} ${cfg.color}`} />
        <span className={`text-sm font-medium ${cfg.textColor}`}>
          {cfg.label}
        </span>
      </div>

      {status === 'connected' && devices.length > 0 && (
        <div className="pl-4">
          <label className="mb-1 block text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Active Reader
          </label>
          <select
            value={selectedDevice || ''}
            onChange={handleDeviceChange}
            className="w-full appearance-none rounded-md border bg-background px-2 py-1 text-[11px] font-mono text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          >
            {devices.map((uid, i) => (
              <option key={uid} value={uid}>
                Reader {i + 1} — {shortUid(uid)}
              </option>
            ))}
          </select>
          {selectedDevice && (
            <div className="mt-1 break-all font-mono text-[9px] text-muted-foreground">
              {selectedDevice}
            </div>
          )}
        </div>
      )}

      {status === 'no-sdk' && (
        <div className="pl-4 text-[11px] text-muted-foreground">
          Start the DigitalPersona Agent service.
          <br />
          Fallback: manual FMD input active.
        </div>
      )}
      {status === 'disconnected' && (
        <div className="pl-4 text-[11px] text-muted-foreground">
          Connect your U.are.U 4500 scanner via USB.
        </div>
      )}
    </div>
  );
}
