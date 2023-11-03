import { AccessoryConfig, AccessoryPlugin, Service } from 'homebridge';

import { Datapoint } from 'knx';

import { PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_DISPLAY_NAME } from './settings';

import { SmokeSensorPlatform } from './platform';


export class SmokeSensorAccessory implements AccessoryPlugin {
  private readonly uuid_base: string;
  private readonly name: string;
  private readonly displayName: string;

  private readonly listen_smoke_detected: string;
  private readonly listen_status_fault: string;
  private readonly listen_status_tampered: string;
  private readonly listen_low_battery: string;

  private readonly smokeSensorService: Service;
  private readonly informationService: Service;

  constructor(
    private readonly platform: SmokeSensorPlatform,
    private readonly config: AccessoryConfig,
  ) {

    this.name = config.name;
    this.listen_smoke_detected = config.listen_smoke_detected;
    this.listen_status_fault = config.listen_status_fault;
    this.listen_status_tampered = config.listen_status_tampered;
    this.listen_low_battery = config.listen_low_battery;
    this.uuid_base = platform.uuid.generate(PLUGIN_NAME + '-' + this.name + '-' + this.listen_smoke_detected);
    this.displayName = this.uuid_base;

    this.informationService = new platform.Service.AccessoryInformation()
      .setCharacteristic(platform.Characteristic.Name, this.name)
      .setCharacteristic(platform.Characteristic.Identify, this.name)
      .setCharacteristic(platform.Characteristic.Manufacturer, '@jendrik')
      .setCharacteristic(platform.Characteristic.Model, PLUGIN_DISPLAY_NAME)
      .setCharacteristic(platform.Characteristic.SerialNumber, this.displayName)
      .setCharacteristic(platform.Characteristic.FirmwareRevision, PLUGIN_VERSION);

    this.smokeSensorService = new platform.Service.SmokeSensor(this.name);

    const dp_listen_smoke_detected = new Datapoint({
      ga: this.listen_smoke_detected,
      dpt: 'DPT1.001',
      autoread: true,
    }, platform.connection);

    dp_listen_smoke_detected.on('change', (oldValue: number, newValue: number) => {
      platform.log.info(`Smoke Detected: ${newValue}`);
      this.smokeSensorService.getCharacteristic(platform.Characteristic.SmokeDetected).updateValue(newValue);
    });

    if (this.listen_status_fault !== undefined) {
      //this.smokeSensorService.addCharacteristic(platform.Characteristic.StatusFault);

      const dp_listen_status_fault = new Datapoint({
        ga: this.listen_status_fault,
        dpt: 'DPT1.001',
        autoread: true,
      }, platform.connection);

      dp_listen_status_fault.on('change', (oldValue: number, newValue: number) => {
        platform.log.info(`Status Fault: ${newValue}`);
        this.smokeSensorService.getCharacteristic(platform.Characteristic.StatusFault).updateValue(newValue);
      });
    }

    if (this.listen_status_tampered !== undefined) {
      //this.smokeSensorService.addCharacteristic(platform.Characteristic.StatusTampered);

      const dp_listen_status_tampered = new Datapoint({
        ga: this.listen_status_tampered,
        dpt: 'DPT1.001',
        autoread: true,
      }, platform.connection);

      dp_listen_status_tampered.on('change', (oldValue: number, newValue: number) => {
        platform.log.info(`Status Fault: ${newValue}`);
        this.smokeSensorService.getCharacteristic(platform.Characteristic.StatusTampered).updateValue(newValue);
      });
    }

    if (this.listen_low_battery !== undefined) {
      //this.smokeSensorService.addCharacteristic(platform.Characteristic.StatusLowBattery);

      const dp_listen_low_battery = new Datapoint({
        ga: this.listen_low_battery,
        dpt: 'DPT1.001',
        autoread: true,
      }, platform.connection);

      dp_listen_low_battery.on('change', (oldValue: number, newValue: number) => {
        platform.log.info(`Status Fault: ${newValue}`);
        this.smokeSensorService.getCharacteristic(platform.Characteristic.StatusLowBattery).updateValue(newValue);
      });
    }
  }

  getServices(): Service[] {
    return [
      this.informationService,
      this.smokeSensorService,
    ];
  }
}
