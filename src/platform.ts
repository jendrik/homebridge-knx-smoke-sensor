import type { API, StaticPlatformPlugin, Logger, PlatformConfig, AccessoryPlugin, Service, Characteristic, uuid } from 'homebridge';

import { Connection } from 'knx';

import { SmokeSensorAccessory } from './accessory.js';
import { normalizePlatformConfig, type NormalizedPlatformConfig } from './config.js';


export class SmokeSensorPlatform implements StaticPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly uuid: typeof uuid;

  public readonly normalizedConfig: NormalizedPlatformConfig;
  public readonly connection: Connection;

  private readonly devices: SmokeSensorAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    this.uuid = api.hap.uuid;
    this.normalizedConfig = normalizePlatformConfig(config, log);
    // connect
    this.connection = new Connection({
      ipAddr: this.normalizedConfig.ip,
      ipPort: this.normalizedConfig.port,
      handlers: {
        connected: function () {
          log.info('KNX connected');
        },
        error: function (connstatus: unknown) {
          log.error(`KNX status: ${connstatus}`);
        },
      },
    });

    // read devices
    for (const device of this.normalizedConfig.devices) {
      this.devices.push(new SmokeSensorAccessory(this, device));
    }

    log.info(`finished initializing ${this.devices.length} accessories!`);
  }

  accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
    callback(this.devices);
  }
}
