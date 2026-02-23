# Changelog

All notable changes to this project will be documented in this file.

## [0.5.0](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.4.2...v0.5.0) (2026-02-23)

### ✨ Features

* add minAmount/maxAmount filter to getDailyExpenses action ([ff552f7](https://github.com/aaronjoeldev/cashlytics-ai/commit/ff552f741ddc5e270e1b0a6f77f1e58cedf8e9d8))
* add semiannual (halbjährlich) recurrence type for expenses ([a67bf02](https://github.com/aaronjoeldev/cashlytics-ai/commit/a67bf025bb9414d5a43f6a6dfb286242fd258f0b))
* add updateDailyExpense, getTransfers, createTransfer tools and amount filter to getDailyExpenses ([c9b474e](https://github.com/aaronjoeldev/cashlytics-ai/commit/c9b474e0c4389d6ac107aa3a4e856a559675b0f7))

### 🐛 Bug Fixes

* pass amount filter to action instead of client-side filtering in getDailyExpenses tool ([cdaa89c](https://github.com/aaronjoeldev/cashlytics-ai/commit/cdaa89c69a0b63008d1331794abe8d8f0b3bf127))

## [0.4.2](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.4.1...v0.4.2) (2026-02-23)

### 🐛 Bug Fixes

* API input validation, prompt injection protection, rate limiting ([0c80d91](https://github.com/aaronjoeldev/cashlytics-ai/commit/0c80d912bfdd039a11faba120b7795380679e332))
* remove content check from chat validation — UIMessage uses parts not content ([e2d11f2](https://github.com/aaronjoeldev/cashlytics-ai/commit/e2d11f2cfdc45d002080e35e4bb6c8e8d8f17306))
* replace console.error with structured logger across all actions and API routes ([2463e5f](https://github.com/aaronjoeldev/cashlytics-ai/commit/2463e5f55b6518721f4446c08aaee0a31afe2254))
* safeParseFloat utility, parallelize getForecast, UTC date normalization ([d2abfb3](https://github.com/aaronjoeldev/cashlytics-ai/commit/d2abfb35127fdc8617f8cd11cacbeb09c57685f1))

## [0.4.1](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.4.0...v0.4.1) (2026-02-21)

### 🐛 Bug Fixes

* remove orphan translation ([6764c44](https://github.com/aaronjoeldev/cashlytics-ai/commit/6764c44ed963cd04ddbe4760afc4dac718bc7cf9))

## [0.4.0](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.3.2...v0.4.0) (2026-02-19)

### ✨ Features

* implement all english translations ([f97d7b2](https://github.com/aaronjoeldev/cashlytics-ai/commit/f97d7b26c9f46a6bffff1357b245aabed5b5b86a))

### 🐛 Bug Fixes

* solve colors not showing in analytics ([e9fcea7](https://github.com/aaronjoeldev/cashlytics-ai/commit/e9fcea79fdf95b097ffb4dbfc201353372519e6d))

## [0.3.2](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.3.1...v0.3.2) (2026-02-18)

### 🐛 Bug Fixes

* solve demo seeder bug ([9753359](https://github.com/aaronjoeldev/cashlytics-ai/commit/9753359b20d9c9bf7158e57d54f31b1599669ada))

## [0.3.1](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.3.0...v0.3.1) (2026-02-18)

### 🐛 Bug Fixes

* change port of demo stack ([7169daf](https://github.com/aaronjoeldev/cashlytics-ai/commit/7169dafccd8257373e405c3ec42355fba79b4c5e))

## [0.3.0](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.2.0...v0.3.0) (2026-02-18)

### ✨ Features

* add demo content ([3c711af](https://github.com/aaronjoeldev/cashlytics-ai/commit/3c711af32b8d0d1331933fd753ee7d12edb93d0c))

## [0.2.0](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.1.0...v0.2.0) (2026-02-18)

### ✨ Features

* implement calender view ([4f8c3ba](https://github.com/aaronjoeldev/cashlytics-ai/commit/4f8c3bad97557abf1cf32b299b15e0b62d756d69))

## [0.1.0] (2026-02-18) - Initial Public Release

### ✨ Features

* Initial release of Cashlytics AI
* Dashboard with financial overview
* Expense tracking and management
* Income tracking and management
* Account management
* Analytics and reporting
* AI-powered assistant
* Category management
* Multi-language support (DE/EN)
* Dark/Light theme support
* File upload to expenses
* Drizzle migration in Dockerfile
* Logo and favicon
