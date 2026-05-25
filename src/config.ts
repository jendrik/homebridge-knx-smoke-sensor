export interface KnxSmokeDeviceConfig {
  name: string;
  listen_smoke_detected: string;
  listen_status_fault?: string;
  listen_status_tampered?: string;
  listen_low_battery?: string;
}

export interface NormalizedPlatformConfig {
  ip: string;
  port: number;
  devices: KnxSmokeDeviceConfig[];
}

interface ConfigLogger {
  warn(message: string): void;
}

const DEFAULT_IP = '224.0.23.12';
const DEFAULT_PORT = 3671;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizePort(value: unknown, log: ConfigLogger): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const port = typeof value === 'string' ? Number(value) : value;
  if (typeof port === 'number' && Number.isInteger(port) && port > 0 && port <= 65535) {
    return port;
  }

  log.warn(`Invalid KNX port "${String(value)}"; using default ${DEFAULT_PORT}`);
  return DEFAULT_PORT;
}

function normalizeDevice(value: unknown, index: number, log: ConfigLogger): KnxSmokeDeviceConfig | undefined {
  if (!isRecord(value) || !isNonEmptyString(value.name) || !isNonEmptyString(value.listen_smoke_detected)) {
    log.warn(`Skipping invalid KNX smoke sensor device at index ${index}`);
    return undefined;
  }

  const device: KnxSmokeDeviceConfig = {
    name: value.name,
    listen_smoke_detected: value.listen_smoke_detected,
  };

  if (isNonEmptyString(value.listen_status_fault)) {
    device.listen_status_fault = value.listen_status_fault;
  }

  if (isNonEmptyString(value.listen_status_tampered)) {
    device.listen_status_tampered = value.listen_status_tampered;
  }

  if (isNonEmptyString(value.listen_low_battery)) {
    device.listen_low_battery = value.listen_low_battery;
  }

  return device;
}

function normalizeDevices(value: unknown, log: ConfigLogger): KnxSmokeDeviceConfig[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    log.warn('Invalid KNX smoke sensor devices configuration; using no devices');
    return [];
  }

  const devices: KnxSmokeDeviceConfig[] = [];
  value.forEach((entry, index) => {
    const device = normalizeDevice(entry, index, log);
    if (device !== undefined) {
      devices.push(device);
    }
  });

  return devices;
}

export function normalizePlatformConfig(config: unknown, log: ConfigLogger): NormalizedPlatformConfig {
  const source = isRecord(config) ? config : {};
  const ip = typeof source.ip === 'string' && source.ip.length > 0 ? source.ip : DEFAULT_IP;

  return {
    ip,
    port: normalizePort(source.port, log),
    devices: normalizeDevices(source.devices, log),
  };
}
