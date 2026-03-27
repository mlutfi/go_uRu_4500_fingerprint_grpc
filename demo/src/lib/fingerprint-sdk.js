'use client';

/**
 * DigitalPersona SDK 4.0 Fingerprint Reader Wrapper
 * 
 * Uses the DigitalPersona devices UMD bundle loaded as a global (dp.devices).
 * The WebSdk global provides the WebSocket channel to the DpHost service.
 * 
 * Load order in layout.js (via <Script>):
 *   1. websdk.client.bundle.min.js → creates `WebSdk` global
 *   2. dp.core.umd.js → creates `dp.core` global  
 *   3. dp.devices.umd.js → creates `dp.devices` global (FingerprintReader, SampleFormat, etc.)
 */

const QUALITY_LABELS = {
  0: 'Good',
  1: 'No Image',
  2: 'Too Light',
  3: 'Too Dark',
  4: 'Too Noisy',
  5: 'Low Contrast',
  6: 'Not Enough Features',
  7: 'Not Centered',
  8: 'Not A Finger',
  9: 'Too High',
  10: 'Too Low',
  11: 'Too Left',
  12: 'Too Right',
  13: 'Too Strange',
  14: 'Too Fast',
  15: 'Too Skewed',
  16: 'Too Short',
  17: 'Too Slow',
  18: 'Reverse Motion',
  19: 'Pressure Too Hard',
  20: 'Pressure Too Light',
  21: 'Wet Finger',
  22: 'Fake Finger',
  23: 'Too Small',
  24: 'Rotated Too Much',
};

/**
 * SampleFormat enum values (from @digitalpersona/devices)
 */
export const SampleFormat = {
  Raw: 1,
  Intermediate: 2,
  Compressed: 3,
  PngImage: 5,
};

const STORAGE_KEY = 'fingerauth_selected_device';

export class FingerprintSDK {
  constructor() {
    this.reader = null;
    this.currentDeviceUid = null;
    this.selectedDeviceUid = null;
    this.isCapturing = false;
    this._initialized = false;
    this._handlers = {};
    this._onDeviceChangeCallbacks = [];

    // Restore selected device from localStorage
    if (typeof window !== 'undefined') {
      try {
        this.selectedDeviceUid = localStorage.getItem(STORAGE_KEY) || null;
      } catch { /* ignore */ }
    }
  }

  /**
   * Initialize the SDK. 
   * The dp.devices global must be available (loaded via script tag).
   */
  async init() {
    if (this._initialized) return true;

    try {
      if (typeof window === 'undefined') return false;

      // Check if dp.devices is available (from UMD bundle)
      const dpDevices = window.dp?.devices;

      if (!dpDevices || !dpDevices.FingerprintReader) {
        console.warn('[FP SDK] dp.devices.FingerprintReader not found. Check script loading order.');
        return false;
      }

      // Also check WebSdk is available (needed by the Channel inside FingerprintReader)
      if (typeof window.WebSdk === 'undefined') {
        console.warn('[FP SDK] WebSdk global not found. Is the websdk.client.bundle loaded?');
        return false;
      }

      // Pre-flight: test if DpHost HTTPS endpoint is reachable
      // The browser must trust the self-signed certificate at 127.0.0.1:52181
      const reachable = await this._testDpHostReachability();
      if (!reachable) {
        console.warn('[FP SDK] DpHost HTTPS endpoint not reachable. Certificate may need to be trusted.');
        this._certError = true;
        return false;
      }

      this.reader = new dpDevices.FingerprintReader();
      this._initialized = true;
      this._certError = false;
      console.log('[FP SDK] Initialized with dp.devices.FingerprintReader');
      return true;
    } catch (err) {
      console.error('[FP SDK] Init error:', err);
      return false;
    }
  }

  /**
   * Pre-flight check: can we reach the DpHost HTTPS endpoint?
   * This catches certificate trust issues before FingerprintReader tries to connect.
   */
  async _testDpHostReachability() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch('https://127.0.0.1:52181/get_connection', {
        signal: controller.signal,
        mode: 'cors',
      });
      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  /** Returns true if the DpHost cert was rejected */
  hasCertError() {
    return this._certError === true;
  }

  isAvailable() {
    return this._initialized && this.reader !== null;
  }

  /**
   * Register event handlers. Supported events:
   *   DeviceConnected, DeviceDisconnected, SamplesAcquired,
   *   QualityReported, ErrorOccurred, AcquisitionStarted, 
   *   AcquisitionStopped, CommunicationFailed
   */
  on(eventName, handler) {
    if (!this.reader) return;
    this._handlers[eventName] = handler;
    this.reader.on(eventName, handler);
  }

  off(eventName) {
    if (!this.reader || !this._handlers[eventName]) return;
    this.reader.off(eventName, this._handlers[eventName]);
    delete this._handlers[eventName];
  }

  /**
   * Get list of connected fingerprint readers
   * @returns {Promise<string[]>}
   */
  async getDeviceList() {
    if (!this.reader) return [];
    try {
      const devices = await this.reader.enumerateDevices();
      return devices || [];
    } catch (err) {
      console.error('[FP SDK] enumerateDevices error:', err);
      return [];
    }
  }

  async getDeviceInfo(deviceUid) {
    if (!this.reader) return null;
    try {
      return await this.reader.getDeviceInfo(deviceUid);
    } catch (err) {
      console.error('[FP SDK] getDeviceInfo error:', err);
      return null;
    }
  }

  /**
   * Get or set the selected device UID (persisted to localStorage)
   */
  getSelectedDevice() {
    return this.selectedDeviceUid;
  }

  setSelectedDevice(deviceUid) {
    this.selectedDeviceUid = deviceUid;
    try {
      if (deviceUid) {
        localStorage.setItem(STORAGE_KEY, deviceUid);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* ignore */ }
    console.log('[FP SDK] Selected device:', deviceUid);
    // Notify listeners
    this._onDeviceChangeCallbacks.forEach(cb => cb(deviceUid));
  }

  /** Register a callback for when selected device changes */
  onSelectedDeviceChange(callback) {
    this._onDeviceChangeCallbacks.push(callback);
  }

  /** Unregister device-change callback */
  offSelectedDeviceChange(callback) {
    this._onDeviceChangeCallbacks = this._onDeviceChangeCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Start fingerprint capture in Intermediate format (for FMD data)
   * Uses the selected device if no deviceUid is specified.
   */
  async startCapture(deviceUid = null) {
    if (!this.reader) return false;

    const uid = deviceUid || this.selectedDeviceUid;

    try {
      await this.reader.startAcquisition(
        SampleFormat.Intermediate,
        uid || undefined
      );
      this.isCapturing = true;
      this.currentDeviceUid = uid;
      console.log('[FP SDK] Capture started on device:', uid || '(default)');
      return true;
    } catch (err) {
      console.error('[FP SDK] startCapture error:', err);
      return false;
    }
  }

  async stopCapture(deviceUid = null) {
    if (!this.reader || !this.isCapturing) return;
    try {
      await this.reader.stopAcquisition(deviceUid || this.currentDeviceUid || undefined);
      this.isCapturing = false;
      console.log('[FP SDK] Capture stopped');
    } catch (err) {
      console.error('[FP SDK] stopCapture error:', err);
    }
  }

  dispose() {
    if (this.isCapturing) this.stopCapture();
    if (this.reader) {
      Object.keys(this._handlers).forEach(name => this.off(name));
    }
    this.reader = null;
    this._initialized = false;
  }
}

export function getQualityLabel(code) {
  return QUALITY_LABELS[code] || `Unknown (${code})`;
}

// Singleton
let sdkInstance = null;

export function getSDK() {
  if (!sdkInstance) {
    sdkInstance = new FingerprintSDK();
  }
  return sdkInstance;
}
