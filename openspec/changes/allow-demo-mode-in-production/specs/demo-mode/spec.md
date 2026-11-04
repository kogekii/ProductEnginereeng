# Spec Delta

## Purpose

Define how the application behaves when demonstration access is explicitly enabled, including when it is deployed with production runtime settings.

## ADDED Requirements

### Requirement: Demo mode may run with production runtime settings
The system SHALL accept `DEMO_MODE=true` together with `NODE_ENV=production` and keep the production runtime configuration active.

#### Scenario: Start production application with demo mode enabled
- **WHEN** the application loads configuration with `NODE_ENV=production` and `DEMO_MODE=true`
- **THEN** configuration loading succeeds, reports production as the runtime environment, and enables demo mode

#### Scenario: Start production application with demo mode disabled
- **WHEN** the application loads configuration with `NODE_ENV=production` and `DEMO_MODE=false`
- **THEN** configuration loading succeeds, reports production as the runtime environment, and disables demo mode
