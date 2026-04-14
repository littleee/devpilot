# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added ESLint and Prettier tooling with TypeScript + React Hooks support.
- Added `CHANGELOG.md` to track release history.
- Added transient network-error toast and toolbar health indicator for failed sync operations.

### Changed
- Extracted inline CSS string from `view.tsx` into `styles.css.ts`.
- Refactored monolithic `DevPilotApp` component by extracting `useAnnotations`, `useStability`, `useAreaSelection`, and `useDrag` hooks.
- Replaced silent `.catch(console.warn)` network failures with surfaced UI feedback via `onNetworkError` callbacks.

### Fixed
- Reduced `view.tsx` from ~3,200 lines to ~400 lines, improving maintainability and build performance.

## [0.1.0] - 2024-04-10

### Added
- Initial release of `@littleee/devpilot` browser toolbar package.
- Annotation system with element, text, and area selection modes.
- Stability issue tracking with auto-observation of JS errors and failed fetches.
- Remote session sync via SSE with localStorage persistence.
- Repair request pipeline for stability items.
- Settings panel with MCP/SSE connection status indicators.
