# Homebridge 2 Modernization Design

## Goal

Update `@jendrik/homebridge-knx-smoke-sensor` for Homebridge 2 only. Homebridge 1, Node 18, and Node 20 compatibility are out of scope. The plugin should remain a static platform plugin for now.

## Current State

The package is already ESM TypeScript and uses `StaticPlatformPlugin`. It currently advertises both Homebridge 1 and Homebridge 2 beta support, allows Node 18/20/22, and depends on `homebridge@^2.0.0-beta.0` for development. The implementation creates one KNX connection and one static accessory instance per configured smoke sensor.

The main gaps before calling it Homebridge 2-ready are:

- package engines and documentation still allow old runtime targets;
- `homebridge` development dependency points at a beta range instead of stable v2;
- config data is carried through untyped fields and one `any`;
- `config.schema.json` defines `port` as a string while the code uses it as a port value;
- raw KNX DPT values are passed directly into HomeKit characteristics instead of explicit HomeKit enum constants;
- there are no automated tests for config normalization or accessory behavior;
- untracked `.github` workflow files exist and should not be treated as already committed project state.

## Chosen Approach

Use a focused Homebridge 2-only modernization while keeping `StaticPlatformPlugin`.

This keeps the current operational model and avoids adding dynamic-platform accessory-cache lifecycle code that the KNX smoke sensor use case does not need yet. The work should make the existing plugin stricter, easier to test, and aligned with stable Homebridge 2 packaging.

## Package and Runtime Targets

Set package engines to:

- `homebridge: ^2.0.0`
- `node: ^22.12.0 || ^24.0.0`

Update the development dependency from the Homebridge 2 beta to the current stable Homebridge 2 release. Refresh compatible development tooling and the KNX dependency within normal semver-safe ranges unless a package has a breaking-major update that requires code changes beyond this scope.

The README should state Homebridge 2 and Node 22.12+/24+ as requirements. It should no longer mention Homebridge 1, Node 18, or Node 20.

## Architecture

`src/index.ts` remains the registration entrypoint and registers the platform alias.

`src/platform.ts` should own:

- Homebridge API references;
- platform config normalization;
- KNX connection construction;
- smoke sensor accessory construction;
- static `accessories` callback behavior.

`src/accessory.ts` should own:

- accessory information service setup;
- smoke sensor service setup;
- datapoint construction for one device;
- KNX value conversion into HomeKit characteristic values;
- per-device diagnostic logging.

`src/settings.ts` remains the single source for plugin alias, package name, display name, and package version unless implementation finds an existing Homebridge package-version pattern that is cleaner.

## Config Model

Introduce typed config interfaces for the platform and devices. Normalize `PlatformConfig` at startup into an internal config shape before constructing accessories.

The normalized platform config should contain:

- `ip`, defaulting to `224.0.23.12`;
- `port`, defaulting to `3671` and coerced to a number if Homebridge supplies a string;
- `devices`, always an array.

Each normalized device should contain:

- `name`, required and non-empty;
- `listen_smoke_detected`, required and non-empty;
- optional `listen_status_fault`;
- optional `listen_status_tampered`;
- optional `listen_low_battery`.

Invalid or incomplete device entries should be skipped with a warning that includes enough context to fix the config. A missing or invalid `devices` array should warn and start with no accessories rather than throwing during Homebridge startup.

## HomeKit Characteristic Mapping

Convert KNX DPT `DPT1.001` values explicitly to HomeKit characteristic constants:

- `SmokeDetected`: `SMOKE_DETECTED` for truthy KNX values, otherwise `SMOKE_NOT_DETECTED`;
- `StatusFault`: `GENERAL_FAULT` for truthy KNX values, otherwise `NO_FAULT`;
- `StatusTampered`: `TAMPERED` for truthy KNX values, otherwise `NOT_TAMPERED`;
- `StatusLowBattery`: `BATTERY_LEVEL_LOW` for truthy KNX values, otherwise `BATTERY_LEVEL_NORMAL`.

Accessory logs should include the configured device name and the characteristic being updated. Logs should be concise enough for normal Homebridge output.

## Config UI Schema

Update `config.schema.json` to match the normalized config:

- `ip` remains a string and shows `224.0.23.12` as the example value;
- `port` becomes an integer with a default of `3671` and a valid KNX port range;
- `devices` requires at least one configured sensor in the UI schema;
- group-address fields keep the current three-level KNX address pattern;
- field descriptions should be clear in Homebridge Config UI.

Backward-compatible handling of old schema quirks is not required.

## Tests and Verification

Add lightweight automated tests that do not require a live KNX network. The tests should cover:

- platform config normalization defaults;
- string-to-number port normalization;
- invalid device filtering;
- KNX boolean to HomeKit characteristic mapping.

Use Node's built-in `node:test` runner. Tests can import compiled JavaScript from `dist`, so the `test` script should build first and then run the test files without adding a separate test framework. Update CI expectations accordingly if workflow files are brought under version control.

Required local verification before completion:

- `npm run lint`;
- `npm run build`;
- `npm test`.

Live KNX network tests are out of scope because they require hardware and local network state.

## Documentation

Update `README.md` to describe:

- Homebridge 2-only support;
- Node 22.12+/24+ runtime requirements;
- current configuration fields and defaults;
- the fact that each KNX address uses `DPT1.001`.

Remove references that imply Homebridge 1 compatibility.

## CI and Repository Hygiene

The existing untracked `.github` directory should be treated as user-owned pending implementation. If CI is included in implementation, workflows should test Node 22 and 24 with `npm ci`, `npm run lint`, `npm run build`, and `npm test`.

Generated `dist` output should only be committed if the repository already expects published build artifacts to be tracked. Implementation should check current repository practice before changing that behavior.

## Out of Scope

- converting to a dynamic platform;
- preserving Homebridge 1 compatibility;
- preserving Node 18 or Node 20 compatibility;
- adding write/control behavior for KNX group addresses;
- adding live KNX integration tests;
- changing the plugin alias or configuration key names beyond schema type corrections.
