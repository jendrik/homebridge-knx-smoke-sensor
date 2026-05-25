# Homebridge 2 Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `@jendrik/homebridge-knx-smoke-sensor` a Homebridge 2-only static platform plugin with current dependencies, typed config handling, explicit HomeKit value mapping, tests, schema updates, and documentation.

**Architecture:** Keep the existing ESM TypeScript `StaticPlatformPlugin` architecture. Add small focused modules for config normalization and HomeKit characteristic mapping, then update the platform/accessory classes to consume those modules without converting to a dynamic platform.

**Tech Stack:** TypeScript ESM, Homebridge 2, Node 22.12+/24, `knx`, ESLint 9, Node built-in `node:test`.

---

## File Structure

- Modify `package.json`: Homebridge/Node engines, dependencies, scripts, and package metadata.
- Modify `package-lock.json`: lockfile refresh from `npm install`.
- Create `src/config.ts`: typed platform/device config normalization and validation helpers.
- Create `src/homekit-mapping.ts`: KNX boolean to HomeKit characteristic enum mapping helpers.
- Modify `src/platform.ts`: consume normalized config, remove `any`, improve warnings and startup behavior.
- Modify `src/accessory.ts`: consume normalized device config and explicit mapping helpers.
- Modify `src/settings.ts`: keep constants consistent with package version.
- Modify `config.schema.json`: Homebridge Config UI schema alignment for v2-only config.
- Modify `README.md`: Homebridge 2-only requirements and config docs.
- Create `test/config.test.mjs`: tests importing compiled `dist/config.js`.
- Create `test/homekit-mapping.test.mjs`: tests importing compiled `dist/homekit-mapping.js`.
- Optionally modify `.github/workflows/*.yml`: only if the untracked `.github` directory is intentionally included in this implementation.

---

### Task 1: Update Package Runtime Targets and Scripts

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Update `package.json` engines and scripts**

Set Homebridge and Node engines to Homebridge 2-only, add a `test` script, and remove runtime targets that are no longer supported.

Expected `engines` and `scripts` sections:

```json
{
  "engines": {
    "node": "^22.12.0 || ^24.0.0",
    "homebridge": "^2.0.0"
  },
  "scripts": {
    "build": "rimraf ./dist && tsc",
    "lint": "eslint . --max-warnings=0",
    "test": "npm run build && node --test test/*.test.mjs",
    "prepublishOnly": "npm run lint && npm test",
    "watch": "npm run build && npm link && nodemon"
  }
}
```

- [ ] **Step 2: Refresh dependency ranges**

Update `package.json` dependency ranges to current compatible versions:

```json
{
  "devDependencies": {
    "@eslint/js": "^9",
    "@types/node": "^24",
    "eslint": "^9",
    "homebridge": "^2.0.2",
    "nodemon": "^3",
    "rimraf": "^6",
    "typescript": "^5",
    "typescript-eslint": "^8"
  },
  "dependencies": {
    "knx": "^2.5.4"
  }
}
```

Remove `ts-node` if it is unused after confirming no script references it:

```sh
rg "ts-node" .
```

Expected: no references except `package.json`/`package-lock.json` before removal.

- [ ] **Step 3: Refresh lockfile**

Run:

```sh
npm install
```

Expected: `package-lock.json` updates, installation succeeds, and npm may warn if the current local Node version is outside the new engine range. If the local Node version is outside range, switch to Node 22.12+ or 24 before continuing.

- [ ] **Step 4: Verify package metadata**

Run:

```sh
npm pkg get engines scripts.devDependencies scripts.dependencies
```

Expected: the package reports Homebridge `^2.0.0`, Node `^22.12.0 || ^24.0.0`, and a `test` script.

- [ ] **Step 5: Commit package target updates**

```sh
git add package.json package-lock.json
git commit -m "chore: target Homebridge 2 runtime"
```

---

### Task 2: Add Typed Config Normalization

**Files:**
- Create: `src/config.ts`
- Create: `test/config.test.mjs`

- [ ] **Step 1: Write failing config tests**

Create `test/config.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizePlatformConfig } from '../dist/config.js';

function createLog() {
  const warnings = [];

  return {
    warnings,
    log: {
      warn(message) {
        warnings.push(message);
      },
    },
  };
}

test('normalizePlatformConfig applies KNX defaults', () => {
  const { log } = createLog();

  const config = normalizePlatformConfig({}, log);

  assert.equal(config.ip, '224.0.23.12');
  assert.equal(config.port, 3671);
  assert.deepEqual(config.devices, []);
});

test('normalizePlatformConfig converts string ports to numbers', () => {
  const { log } = createLog();

  const config = normalizePlatformConfig({
    ip: '192.168.1.20',
    port: '3672',
    devices: [],
  }, log);

  assert.equal(config.ip, '192.168.1.20');
  assert.equal(config.port, 3672);
});

test('normalizePlatformConfig filters invalid devices with warnings', () => {
  const { log, warnings } = createLog();

  const config = normalizePlatformConfig({
    devices: [
      { name: 'Kitchen', listen_smoke_detected: '1/2/3' },
      { name: '', listen_smoke_detected: '1/2/4' },
      { name: 'Missing Smoke GA' },
      null,
    ],
  }, log);

  assert.deepEqual(config.devices, [
    {
      name: 'Kitchen',
      listen_smoke_detected: '1/2/3',
      listen_status_fault: undefined,
      listen_status_tampered: undefined,
      listen_low_battery: undefined,
    },
  ]);
  assert.equal(warnings.length, 3);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```sh
npm run build && node --test --test-name-pattern=normalizePlatformConfig test/config.test.mjs
```

Expected: FAIL because `dist/config.js` does not exist.

- [ ] **Step 3: Implement `src/config.ts`**

Create `src/config.ts`:

```ts
import type { Logger, PlatformConfig } from 'homebridge';

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

const DEFAULT_KNX_IP = '224.0.23.12';
const DEFAULT_KNX_PORT = 3671;

export function normalizePlatformConfig(config: PlatformConfig | Record<string, unknown>, log: Pick<Logger, 'warn'>): NormalizedPlatformConfig {
  return {
    ip: normalizeString(config['ip'], DEFAULT_KNX_IP),
    port: normalizePort(config['port'], log),
    devices: normalizeDevices(config['devices'], log),
  };
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function normalizePort(value: unknown, log: Pick<Logger, 'warn'>): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 65535) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
      return parsed;
    }
  }

  if (value !== undefined) {
    log.warn(`Invalid KNX port "${String(value)}"; using ${DEFAULT_KNX_PORT}.`);
  }

  return DEFAULT_KNX_PORT;
}

function normalizeDevices(value: unknown, log: Pick<Logger, 'warn'>): KnxSmokeDeviceConfig[] {
  if (!Array.isArray(value)) {
    if (value !== undefined) {
      log.warn('Invalid devices configuration; expected an array.');
    }

    return [];
  }

  return value.flatMap((entry, index) => {
    const device = normalizeDevice(entry);

    if (!device) {
      log.warn(`Skipping invalid smoke sensor device at index ${index}. Each device requires name and listen_smoke_detected.`);
      return [];
    }

    return [device];
  });
}

function normalizeDevice(value: unknown): KnxSmokeDeviceConfig | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const name = normalizeOptionalString(value['name']);
  const smokeDetected = normalizeOptionalString(value['listen_smoke_detected']);

  if (!name || !smokeDetected) {
    return undefined;
  }

  return {
    name,
    listen_smoke_detected: smokeDetected,
    listen_status_fault: normalizeOptionalString(value['listen_status_fault']),
    listen_status_tampered: normalizeOptionalString(value['listen_status_tampered']),
    listen_low_battery: normalizeOptionalString(value['listen_low_battery']),
  };
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
```

- [ ] **Step 4: Run config tests**

Run:

```sh
npm run build && node --test --test-name-pattern=normalizePlatformConfig test/config.test.mjs
```

Expected: PASS for the three config normalization tests.

- [ ] **Step 5: Commit config normalization**

```sh
git add src/config.ts test/config.test.mjs
git commit -m "feat: normalize smoke sensor config"
```

---

### Task 3: Add Explicit HomeKit Mapping Helpers

**Files:**
- Create: `src/homekit-mapping.ts`
- Create: `test/homekit-mapping.test.mjs`

- [ ] **Step 1: Write failing mapping tests**

Create `test/homekit-mapping.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mapBatteryStatus,
  mapFaultStatus,
  mapSmokeDetected,
  mapTamperedStatus,
} from '../dist/homekit-mapping.js';

const Characteristic = {
  SmokeDetected: {
    SMOKE_NOT_DETECTED: 0,
    SMOKE_DETECTED: 1,
  },
  StatusFault: {
    NO_FAULT: 0,
    GENERAL_FAULT: 1,
  },
  StatusTampered: {
    NOT_TAMPERED: 0,
    TAMPERED: 1,
  },
  StatusLowBattery: {
    BATTERY_LEVEL_NORMAL: 0,
    BATTERY_LEVEL_LOW: 1,
  },
};

test('mapSmokeDetected maps truthy KNX values to HomeKit constants', () => {
  assert.equal(mapSmokeDetected(0, Characteristic), 0);
  assert.equal(mapSmokeDetected(false, Characteristic), 0);
  assert.equal(mapSmokeDetected(1, Characteristic), 1);
  assert.equal(mapSmokeDetected(true, Characteristic), 1);
});

test('mapFaultStatus maps truthy KNX values to HomeKit constants', () => {
  assert.equal(mapFaultStatus(0, Characteristic), 0);
  assert.equal(mapFaultStatus(1, Characteristic), 1);
});

test('mapTamperedStatus maps truthy KNX values to HomeKit constants', () => {
  assert.equal(mapTamperedStatus(0, Characteristic), 0);
  assert.equal(mapTamperedStatus(1, Characteristic), 1);
});

test('mapBatteryStatus maps truthy KNX values to HomeKit constants', () => {
  assert.equal(mapBatteryStatus(0, Characteristic), 0);
  assert.equal(mapBatteryStatus(1, Characteristic), 1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```sh
npm run build && node --test --test-name-pattern=mapSmokeDetected test/homekit-mapping.test.mjs
```

Expected: FAIL because `dist/homekit-mapping.js` does not exist.

- [ ] **Step 3: Implement `src/homekit-mapping.ts`**

Create `src/homekit-mapping.ts`:

```ts
import type { Characteristic } from 'homebridge';

type CharacteristicConstants = typeof Characteristic;

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

function isTruthyKnxValue(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}
```

- [ ] **Step 4: Run mapping tests**

Run:

```sh
npm run build && node --test --test-name-pattern=map test/homekit-mapping.test.mjs
```

Expected: PASS for HomeKit mapping tests.

- [ ] **Step 5: Commit mapping helpers**

```sh
git add src/homekit-mapping.ts test/homekit-mapping.test.mjs
git commit -m "feat: map KNX values to HomeKit constants"
```

---

### Task 4: Wire Normalized Config and Mapping Into Runtime Code

**Files:**
- Modify: `src/platform.ts`
- Modify: `src/accessory.ts`

- [ ] **Step 1: Update platform imports and config usage**

Change `src/platform.ts` imports to include normalized config:

```ts
import type { API, StaticPlatformPlugin, Logger, PlatformConfig, AccessoryPlugin, Service, Characteristic, uuid } from 'homebridge';

import { Connection } from 'knx';

import { SmokeSensorAccessory } from './accessory.js';
import { normalizePlatformConfig, type NormalizedPlatformConfig } from './config.js';
```

Add a normalized config property:

```ts
  public readonly normalizedConfig: NormalizedPlatformConfig;
```

Normalize config in the constructor before creating the KNX connection:

```ts
    this.normalizedConfig = normalizePlatformConfig(config, log);
```

Use normalized IP/port:

```ts
      ipAddr: this.normalizedConfig.ip,
      ipPort: this.normalizedConfig.port,
```

Replace the current `config.devices.forEach` block with:

```ts
    for (const device of this.normalizedConfig.devices) {
      this.devices.push(new SmokeSensorAccessory(this, device));
    }
```

Replace final startup log with:

```ts
    log.info(`Initialized ${this.devices.length} KNX smoke sensor accessory/accessories.`);
```

- [ ] **Step 2: Update accessory imports and config type**

Change `src/accessory.ts` imports:

```ts
import type { AccessoryPlugin, Service } from 'homebridge';

import { Datapoint } from 'knx';

import type { KnxSmokeDeviceConfig } from './config.js';
import {
  mapBatteryStatus,
  mapFaultStatus,
  mapSmokeDetected,
  mapTamperedStatus,
} from './homekit-mapping.js';
import { PLUGIN_NAME, PLUGIN_VERSION, PLUGIN_DISPLAY_NAME } from './settings.js';

import type { SmokeSensorPlatform } from './platform.js';
```

Change the constructor config parameter:

```ts
    private readonly config: KnxSmokeDeviceConfig,
```

- [ ] **Step 3: Replace raw characteristic updates with explicit mapping**

In `src/accessory.ts`, update each listener:

```ts
    dp_listen_smoke_detected.on('change', (_oldValue: unknown, newValue: unknown) => {
      const mappedValue = mapSmokeDetected(newValue, platform.Characteristic);
      platform.log.info(`[${this.name}] Smoke Detected: ${mappedValue}`);
      this.smokeSensorService.getCharacteristic(platform.Characteristic.SmokeDetected).updateValue(mappedValue);
    });
```

```ts
      dp_listen_status_fault.on('change', (_oldValue: unknown, newValue: unknown) => {
        const mappedValue = mapFaultStatus(newValue, platform.Characteristic);
        platform.log.info(`[${this.name}] Status Fault: ${mappedValue}`);
        this.smokeSensorService.getCharacteristic(platform.Characteristic.StatusFault).updateValue(mappedValue);
      });
```

```ts
      dp_listen_status_tampered.on('change', (_oldValue: unknown, newValue: unknown) => {
        const mappedValue = mapTamperedStatus(newValue, platform.Characteristic);
        platform.log.info(`[${this.name}] Status Tampered: ${mappedValue}`);
        this.smokeSensorService.getCharacteristic(platform.Characteristic.StatusTampered).updateValue(mappedValue);
      });
```

```ts
      dp_listen_low_battery.on('change', (_oldValue: unknown, newValue: unknown) => {
        const mappedValue = mapBatteryStatus(newValue, platform.Characteristic);
        platform.log.info(`[${this.name}] Low Battery: ${mappedValue}`);
        this.smokeSensorService.getCharacteristic(platform.Characteristic.StatusLowBattery).updateValue(mappedValue);
      });
```

- [ ] **Step 4: Run lint and build**

Run:

```sh
npm run lint
npm run build
```

Expected: both commands pass. If lint reports naming warnings for existing snake_case config fields, keep the external config names unchanged and adjust only internal variable names when possible.

- [ ] **Step 5: Run tests**

Run:

```sh
npm test
```

Expected: all config and mapping tests pass.

- [ ] **Step 6: Commit runtime wiring**

```sh
git add src/platform.ts src/accessory.ts
git commit -m "feat: wire typed config and HomeKit mappings"
```

---

### Task 5: Update Config Schema and README

**Files:**
- Modify: `config.schema.json`
- Modify: `README.md`

- [ ] **Step 1: Update config schema**

Change `config.schema.json` so `port` is an integer and `devices` requires one or more sensors.

Expected key schema fragments:

```json
{
  "ip": {
    "title": "KNX Router or Interface",
    "type": "string",
    "default": "224.0.23.12",
    "placeholder": "224.0.23.12",
    "description": "IP address of the KNX router or interface."
  },
  "port": {
    "title": "KNX Port",
    "type": "integer",
    "default": 3671,
    "minimum": 1,
    "maximum": 65535,
    "description": "KNXnet/IP port."
  },
  "devices": {
    "type": "array",
    "minItems": 1
  }
}
```

Keep these group-address field names unchanged:

```json
[
  "listen_smoke_detected",
  "listen_status_fault",
  "listen_status_tampered",
  "listen_low_battery"
]
```

- [ ] **Step 2: Update README requirements**

Replace the requirements section with:

```md
## Requirements

- [Homebridge](https://homebridge.io) v2.0.0 or later
- Node.js 22.12.0+ or 24.0.0+
- A KNX IP router or interface on the network
```

- [ ] **Step 3: Update README config notes**

Ensure the platform options table states:

```md
| `ip` | No | `224.0.23.12` | IP address of the KNX router or interface |
| `port` | No | `3671` | KNXnet/IP port |
| `devices` | Yes | - | Array of smoke sensor devices |
```

Ensure device options state every group address uses `DPT1.001`.

- [ ] **Step 4: Verify docs and schema parse**

Run:

```sh
node -e "JSON.parse(require('node:fs').readFileSync('config.schema.json', 'utf8')); console.log('schema ok')"
rg "v1|1\\.8|Node.js 18|Node.js 20|beta" README.md package.json config.schema.json
```

Expected: first command prints `schema ok`; second command should not find outdated runtime compatibility claims. It may still find `1/1/1` group address examples, which are acceptable.

- [ ] **Step 5: Commit docs and schema**

```sh
git add config.schema.json README.md
git commit -m "docs: document Homebridge 2 configuration"
```

---

### Task 6: Optional CI Alignment

**Files:**
- Modify or create: `.github/workflows/build.yml`
- Modify or create: `.github/workflows/package.yml`

- [ ] **Step 1: Decide whether to include untracked workflows**

Run:

```sh
git status --short .github
```

If `.github` is still untracked and the user has not approved committing it, skip this task. If approved, continue.

- [ ] **Step 2: Update build workflow matrix**

Use Node 22 and 24 and include tests:

```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [22, 24]
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

- [ ] **Step 3: Update package workflow if included**

Ensure package release workflow runs:

```yaml
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

- [ ] **Step 4: Commit CI if included**

```sh
git add .github/workflows/build.yml .github/workflows/package.yml
git commit -m "ci: test Homebridge plugin on Node 22 and 24"
```

---

### Task 7: Final Verification and Release-Readiness Check

**Files:**
- Inspect: all modified files
- Modify: only files needed for fixes found by verification

- [ ] **Step 1: Run full verification**

Run:

```sh
npm run lint
npm run build
npm test
```

Expected: all commands pass.

- [ ] **Step 2: Inspect working tree**

Run:

```sh
git status --short
```

Expected: only intentional uncommitted files remain. If `.github/` remains untracked and was skipped, mention that in the final handoff.

- [ ] **Step 3: Inspect package contents**

Run:

```sh
npm pack --dry-run
```

Expected: package includes `dist`, `README.md`, `config.schema.json`, `LICENSE`, and package metadata. It should not include test files unless the current `.npmignore` intentionally allows them.

- [ ] **Step 4: Commit final fixes if any**

If verification required fixes:

```sh
git add <fixed-files>
git commit -m "fix: complete Homebridge 2 modernization"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review Notes

- Spec coverage: package/runtime targets are covered by Task 1; config model by Task 2; HomeKit mapping by Task 3; runtime wiring by Task 4; schema/docs by Task 5; optional CI by Task 6; verification by Task 7.
- Scope check: the plan does not convert to a dynamic platform, does not preserve Homebridge 1 support, and does not add live KNX tests.
- Type consistency: `KnxSmokeDeviceConfig`, `NormalizedPlatformConfig`, `normalizePlatformConfig`, and `map*` helper names are introduced before use and remain consistent across tasks.
