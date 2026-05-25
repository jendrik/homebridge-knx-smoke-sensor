import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mapBatteryStatus,
  mapFaultStatus,
  mapSmokeDetected,
  mapTamperedStatus,
} from '../dist/homekit-mapping.js';

const Characteristic = {
  SmokeDetected: {
    SMOKE_NOT_DETECTED: 10,
    SMOKE_DETECTED: 11,
  },
  StatusFault: {
    NO_FAULT: 20,
    GENERAL_FAULT: 21,
  },
  StatusTampered: {
    NOT_TAMPERED: 30,
    TAMPERED: 31,
  },
  StatusLowBattery: {
    BATTERY_LEVEL_NORMAL: 40,
    BATTERY_LEVEL_LOW: 41,
  },
};

describe('map HomeKit status constants', () => {
  it('maps falsy KNX smoke values to not detected', () => {
    for (const value of [false, 0, '0', '', null, undefined]) {
      assert.equal(
        mapSmokeDetected(value, Characteristic),
        Characteristic.SmokeDetected.SMOKE_NOT_DETECTED,
      );
    }
  });

  it('maps truthy KNX smoke values to detected', () => {
    for (const value of [true, 1, '1']) {
      assert.equal(
        mapSmokeDetected(value, Characteristic),
        Characteristic.SmokeDetected.SMOKE_DETECTED,
      );
    }
  });

  it('maps falsy KNX fault values to no fault', () => {
    for (const value of [false, 0, '0', '', null, undefined]) {
      assert.equal(
        mapFaultStatus(value, Characteristic),
        Characteristic.StatusFault.NO_FAULT,
      );
    }
  });

  it('maps truthy KNX fault values to general fault', () => {
    for (const value of [true, 1, '1']) {
      assert.equal(
        mapFaultStatus(value, Characteristic),
        Characteristic.StatusFault.GENERAL_FAULT,
      );
    }
  });

  it('maps falsy KNX tampered values to not tampered', () => {
    for (const value of [false, 0, '0', '', null, undefined]) {
      assert.equal(
        mapTamperedStatus(value, Characteristic),
        Characteristic.StatusTampered.NOT_TAMPERED,
      );
    }
  });

  it('maps truthy KNX tampered values to tampered', () => {
    for (const value of [true, 1, '1']) {
      assert.equal(
        mapTamperedStatus(value, Characteristic),
        Characteristic.StatusTampered.TAMPERED,
      );
    }
  });

  it('maps falsy KNX battery values to normal', () => {
    for (const value of [false, 0, '0', '', null, undefined]) {
      assert.equal(
        mapBatteryStatus(value, Characteristic),
        Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL,
      );
    }
  });

  it('maps truthy KNX battery values to low battery', () => {
    for (const value of [true, 1, '1']) {
      assert.equal(
        mapBatteryStatus(value, Characteristic),
        Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW,
      );
    }
  });
});
