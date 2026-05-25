import type { Characteristic as HomebridgeCharacteristic } from 'homebridge';

type CharacteristicConstants = typeof HomebridgeCharacteristic;

function isTruthyKnxValue(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

export function mapSmokeDetected(value: unknown, Characteristic: CharacteristicConstants): number {
  return isTruthyKnxValue(value)
    ? Characteristic.SmokeDetected.SMOKE_DETECTED
    : Characteristic.SmokeDetected.SMOKE_NOT_DETECTED;
}

export function mapFaultStatus(value: unknown, Characteristic: CharacteristicConstants): number {
  return isTruthyKnxValue(value)
    ? Characteristic.StatusFault.GENERAL_FAULT
    : Characteristic.StatusFault.NO_FAULT;
}

export function mapTamperedStatus(value: unknown, Characteristic: CharacteristicConstants): number {
  return isTruthyKnxValue(value)
    ? Characteristic.StatusTampered.TAMPERED
    : Characteristic.StatusTampered.NOT_TAMPERED;
}

export function mapBatteryStatus(value: unknown, Characteristic: CharacteristicConstants): number {
  return isTruthyKnxValue(value)
    ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
    : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
}
