import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizePlatformConfig } from '../dist/config.js';

function createLog() {
  const warnings = [];

  return {
    log: {
      warn(message) {
        warnings.push(message);
      },
    },
    warnings,
  };
}

describe('normalizePlatformConfig', () => {
  it('applies default ip, port, and devices', () => {
    const { log } = createLog();

    const normalized = normalizePlatformConfig({}, log);

    assert.deepEqual(normalized, {
      ip: '224.0.23.12',
      port: 3671,
      devices: [],
    });
  });

  it('converts a string port to a number', () => {
    const { log } = createLog();

    const normalized = normalizePlatformConfig({ port: '3672' }, log);

    assert.equal(normalized.port, 3672);
  });

  it('normalizes blank optional group addresses to undefined', () => {
    const { log } = createLog();

    const normalized = normalizePlatformConfig({
      devices: [
        {
          name: 'Kitchen',
          listen_smoke_detected: '1/2/3',
          listen_status_fault: '',
          listen_status_tampered: '   ',
          listen_low_battery: '1/2/4',
        },
      ],
    }, log);

    assert.deepEqual(normalized.devices, [
      {
        name: 'Kitchen',
        listen_smoke_detected: '1/2/3',
        listen_low_battery: '1/2/4',
      },
    ]);
  });

  it('filters invalid devices and warns for each skipped entry', () => {
    const { log, warnings } = createLog();

    const normalized = normalizePlatformConfig({
      devices: [
        { name: 'Kitchen', listen_smoke_detected: '1/2/3' },
        { name: '', listen_smoke_detected: '1/2/4' },
        { name: 'Hall' },
        'invalid',
      ],
    }, log);

    assert.deepEqual(normalized.devices, [
      { name: 'Kitchen', listen_smoke_detected: '1/2/3' },
    ]);
    assert.deepEqual(warnings, [
      'Skipping invalid KNX smoke sensor device at index 1',
      'Skipping invalid KNX smoke sensor device at index 2',
      'Skipping invalid KNX smoke sensor device at index 3',
    ]);
  });

  it('warns and uses no devices when devices config is not an array', () => {
    const { log, warnings } = createLog();

    const normalized = normalizePlatformConfig({ devices: 'invalid' }, log);

    assert.deepEqual(normalized.devices, []);
    assert.deepEqual(warnings, [
      'Invalid KNX smoke sensor devices configuration; using no devices',
    ]);
  });
});
