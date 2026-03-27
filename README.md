# Homebridge KNX Smoke Sensor

Homebridge plugin for exposing KNX smoke sensors to Apple HomeKit.

## Features

- Exposes KNX smoke detectors as HomeKit smoke sensor accessories
- Supports multiple sensors with individual KNX group address configuration
- Optional characteristics:
  - **Smoke Detected** (required) - smoke alarm state
  - **Status Fault** - sensor fault indication
  - **Status Tampered** - tamper detection
  - **Low Battery** - battery level warning
- Configurable KNX router/interface IP and port
- Supports Homebridge Config UI X for easy setup

## Requirements

- [Homebridge](https://homebridge.io) v1.8.0 or later (including v2.0)
- Node.js 18.20.4+, 20.15.1+, or 22+
- A KNX IP router or interface on the network

## Installation

Install via the Homebridge Config UI X or manually:

```sh
npm install -g @jendrik/homebridge-knx-smoke-sensor
```

## Configuration

Add the platform to your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "knx-smoke-sensor",
      "ip": "224.0.23.12",
      "port": 3671,
      "devices": [
        {
          "name": "Kitchen Smoke Sensor",
          "listen_smoke_detected": "1/2/3",
          "listen_status_fault": "1/2/4",
          "listen_status_tampered": "1/2/5",
          "listen_low_battery": "1/2/6"
        }
      ]
    }
  ]
}
```

### Platform options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `platform` | Yes | — | Must be `knx-smoke-sensor` |
| `ip` | No | `224.0.23.12` | IP address of the KNX router or interface |
| `port` | No | `3671` | KNX port |
| `devices` | Yes | — | Array of smoke sensor devices |

### Device options

| Option | Required | Description |
|--------|----------|-------------|
| `name` | Yes | Display name in HomeKit |
| `listen_smoke_detected` | Yes | KNX group address for smoke detection (DPT 1.001) |
| `listen_status_fault` | No | KNX group address for fault status (DPT 1.001) |
| `listen_status_tampered` | No | KNX group address for tamper status (DPT 1.001) |
| `listen_low_battery` | No | KNX group address for low battery status (DPT 1.001) |

All KNX group addresses use the three-level format (e.g. `1/2/3`).

## Development

```sh
# Install dependencies
npm install

# Build
npm run build

# Lint
npm run lint

# Watch mode (builds, links, and starts Homebridge)
npm run watch
```

## License

[Apache-2.0](LICENSE)
