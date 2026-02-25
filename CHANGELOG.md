# Changelog

All notable changes to this project will be documented in this file.

## 1.0.0 (2026-02-25)

### ✨ Features

- **01-01:** create API route handler ([3de21a3](https://github.com/aaronjoeldev/cashlytics-ai/commit/3de21a312b61d51e73925a81b1f57b7e0e2d03ae))
- **01-01:** create Auth.js v5 configuration ([eb169af](https://github.com/aaronjoeldev/cashlytics-ai/commit/eb169af33e5b6e1522131ec7636faab605eef1ef))
- **01-01:** create credential validation schemas ([6bea0c0](https://github.com/aaronjoeldev/cashlytics-ai/commit/6bea0c05ec7ea7f06c658a47342f684629870318))
- **01-01:** create password hashing utilities ([1875762](https://github.com/aaronjoeldev/cashlytics-ai/commit/1875762bfa380ed7d65c13d427c7be2814402698))
- **01-02:** create proxy.ts with route protection ([eb8b8b4](https://github.com/aaronjoeldev/cashlytics-ai/commit/eb8b8b414249da9b1881006b272aae2d74d7ea44))
- **01-03:** add app service with AUTH_SECRET to docker-compose ([ccd2d9f](https://github.com/aaronjoeldev/cashlytics-ai/commit/ccd2d9f3fe47e75f41b06a166c0ece2b55de98a0))
- **01-03:** add AUTH_SECRET to .env.example ([25e10f8](https://github.com/aaronjoeldev/cashlytics-ai/commit/25e10f8bcea2b6710c9f47e46d80baa27acdfc78))
- **02-01:** add Auth.js adapter tables with prefixed names ([c1e0025](https://github.com/aaronjoeldev/cashlytics-ai/commit/c1e00251f0ac983f266a0e11714a3b67b672e184))
- **02-01:** add Auth.js tables migration (0004) ([2f8e111](https://github.com/aaronjoeldev/cashlytics-ai/commit/2f8e111879ac9e11090f7e666106a1f7fb424c51))
- **02-01:** configure DrizzleAdapter with custom table names ([7b4579f](https://github.com/aaronjoeldev/cashlytics-ai/commit/7b4579f9298c952a4e5ea3ef9474577793533c97))
- **02-03:** create backfill migration script ([c2e5187](https://github.com/aaronjoeldev/cashlytics-ai/commit/c2e5187fd5753d03b33d39e0990dfe54e9f9240a))
- **02-03:** make userId NOT NULL on all data tables ([980caae](https://github.com/aaronjoeldev/cashlytics-ai/commit/980caae9f4ee7adfdcb9a4eb017f4c031a304fc1))
- **02-04:** update seed-demo.sql with userId columns ([555a20f](https://github.com/aaronjoeldev/cashlytics-ai/commit/555a20f441c26ca5acb98c043380ec09320ecd00))
- **03-01:** create requireAuth helper with AuthResult discriminated union ([79cbaef](https://github.com/aaronjoeldev/cashlytics-ai/commit/79cbaef69ab9df53546e6081644e52ba556b6380))
- **03-02:** refactor accounts-actions.ts with requireAuth and userId filtering ([c527679](https://github.com/aaronjoeldev/cashlytics-ai/commit/c5276795aed2680be4efa5f671df758741f9901e))
- **03-03:** add requireAuth + userId filter + FK validation to expenses-actions and incomes-actions ([4454bed](https://github.com/aaronjoeldev/cashlytics-ai/commit/4454bed3a6afb895f13dc490036b4399acf03c98))
- **03-03:** add requireAuth + userId filter + FK validation to legacy expense, income, and daily-expense actions ([2ad6bf4](https://github.com/aaronjoeldev/cashlytics-ai/commit/2ad6bf496038dafe7af64c5b7c382a33b65340ef))
- **03-04:** refactor conversation-actions, document-actions and documents route with auth ([7479147](https://github.com/aaronjoeldev/cashlytics-ai/commit/7479147f065809b8146d09279804eb83cf139d4c))
- **03-04:** refactor transfer-actions.ts with requireAuth and bidirectional FK validation ([1b24b90](https://github.com/aaronjoeldev/cashlytics-ai/commit/1b24b9071eee032caae1eb3b9fae17c2b85caeff))
- **03-05:** add auth to search and forecast actions ([043f89a](https://github.com/aaronjoeldev/cashlytics-ai/commit/043f89a31d2f4a14e4779faa453da158010cb433))
- **03-05:** add requireAuth and userId filtering to analytics-actions.ts ([59f9212](https://github.com/aaronjoeldev/cashlytics-ai/commit/59f92122ee2bd10f40c164e71ad1f72ce022f1bb))
- **04-01:** add registerSchema to auth validations ([4a3d8f9](https://github.com/aaronjoeldev/cashlytics-ai/commit/4a3d8f98acc90bac2a2e45e3262752dc97c8f87d))
- **04-01:** add SessionProvider to Providers component ([125814b](https://github.com/aaronjoeldev/cashlytics-ai/commit/125814b7da2e778ca4b6bea82606aaded791194f))
- **04-01:** create auth server actions (login, register, logout) ([1458283](https://github.com/aaronjoeldev/cashlytics-ai/commit/1458283022da770cbcaa122b8fe01689b9f9ea3a))
- **04-02:** create (auth) route group layout with split-panel Vault design ([e831dfb](https://github.com/aaronjoeldev/cashlytics-ai/commit/e831dfbdbe28976f0844a468782d8aefe3fa6489))
- **04-02:** create login page and LoginForm client component ([f5a04c1](https://github.com/aaronjoeldev/cashlytics-ai/commit/f5a04c1d6a8205ef5961f3a76eb0838e94eb7505))
- **04-03:** create register page and RegisterForm client component ([33f9412](https://github.com/aaronjoeldev/cashlytics-ai/commit/33f9412a4cc54d1773d044f72eff924a0ce92b96))
- **04-04:** add logout button to sidebar footer ([6bb2ca5](https://github.com/aaronjoeldev/cashlytics-ai/commit/6bb2ca5e5e6733b181667eafad2ce9bef5fd5e83))
- **05-01:** add SINGLE_USER_MODE guard to registerAction ([ed3a350](https://github.com/aaronjoeldev/cashlytics-ai/commit/ed3a3500582122276e322ad28bed54124cc8b200))
- **05-01:** create isRegistrationOpen() utility ([ae95ecd](https://github.com/aaronjoeldev/cashlytics-ai/commit/ae95ecddd71fe0a7966e9e9c7ee098fa36598a01))
- **05-02:** add server-side redirect to register page ([32789dc](https://github.com/aaronjoeldev/cashlytics-ai/commit/32789dc517ede1d18fa80104eed2b04cc5e11915))
- **06-01:** add passwordResetTokens table to schema ([4de4672](https://github.com/aaronjoeldev/cashlytics-ai/commit/4de4672a2d370ebbecc0296045c05dbc7c9b404d))
- **06-01:** generate and apply migration for password_reset_tokens ([df8b1e7](https://github.com/aaronjoeldev/cashlytics-ai/commit/df8b1e7d9e9c9930b665d071cd2cfb2d27d03521))
- **07-01:** create email transporter module with lazy singleton ([4055d4a](https://github.com/aaronjoeldev/cashlytics-ai/commit/4055d4a79a7f3d2f83f7c1daf3713d7fe290d394))
- **07-02:** add SMTP and APP_URL environment variables to docker-compose ([6324d09](https://github.com/aaronjoeldev/cashlytics-ai/commit/6324d09e61ed17eee6d101d4ece06afbc1e747fc))
- **08-01:** create reset password email template ([eaab32f](https://github.com/aaronjoeldev/cashlytics-ai/commit/eaab32f7d77dc7ad6ea41dc421f8d2464bfcb04a))
- **08-01:** create Vault-branded base email template ([32e2b34](https://github.com/aaronjoeldev/cashlytics-ai/commit/32e2b34edef26d0c9fa15b742979d43ca4a86d0a))
- **08-02:** create email index with render functions ([6b6dc6c](https://github.com/aaronjoeldev/cashlytics-ai/commit/6b6dc6cb60d571144447390c79ebe569984804ba))
- **08-02:** create welcome email template ([41d4f83](https://github.com/aaronjoeldev/cashlytics-ai/commit/41d4f83718253d9cee64d71b45abbbe0decaacaa))
- **09-01:** create reset token generation and hashing utilities ([c6967ab](https://github.com/aaronjoeldev/cashlytics-ai/commit/c6967abf98a4a1c916c90692b24ae9e7a4a3a05e))
- **09-02:** add token lifecycle DB operations ([c4006a1](https://github.com/aaronjoeldev/cashlytics-ai/commit/c4006a1ef46a16cef18f4e6ebf1c923b72ce2c8e))
- **10-01:** add forgotPasswordAction with email enumeration prevention ([0e24ad3](https://github.com/aaronjoeldev/cashlytics-ai/commit/0e24ad3644a8e491ddd20225eb8b26c01db30f23))
- **10-02:** add resetPasswordAction server action ([be75e9e](https://github.com/aaronjoeldev/cashlytics-ai/commit/be75e9e35463e0982a50f96c83d9a9063f7732e7))
- **11-01:** create forgot-password page route ([9b0a2d3](https://github.com/aaronjoeldev/cashlytics-ai/commit/9b0a2d3bd0b6b26e32a32dd99d8e6cf7ee233f85))
- **11-01:** create ForgotPasswordForm component ([77b8013](https://github.com/aaronjoeldev/cashlytics-ai/commit/77b8013409f4f0d36541eed75a749f171a949baa))
- **11-02:** create reset-password page route with Suspense ([ee658d0](https://github.com/aaronjoeldev/cashlytics-ai/commit/ee658d06e7b37e916a59b0a64cb9b389b8500cb4))
- **11-02:** create ResetPasswordForm component ([eeb9ce4](https://github.com/aaronjoeldev/cashlytics-ai/commit/eeb9ce47bc4dbd87759b4b1a326d1d6d4fc0eefe))
- **11-03:** add Forgot password link to login form ([ca41e6b](https://github.com/aaronjoeldev/cashlytics-ai/commit/ca41e6b281b58d84a75364f547ee8bfa8b1ab50d))
- **11-03:** add post-reset toast and email pre-fill to login ([2c5b527](https://github.com/aaronjoeldev/cashlytics-ai/commit/2c5b52739847f6f25cbc795258dba38291deea8b))
- **12-01:** integrate welcome email in registerAction ([61d364d](https://github.com/aaronjoeldev/cashlytics-ai/commit/61d364da56fd9f726fc60f3c9140523df0c1495a))
- add ability to upload files to expenses, improve ai agent ([0d685a7](https://github.com/aaronjoeldev/cashlytics-ai/commit/0d685a7664a7918104e6fba736aec8d560222a53))
- add automatic migration service to self-host docker compose ([199e692](https://github.com/aaronjoeldev/cashlytics-ai/commit/199e692eefdb7cc5c7ff1b1ab64e018e9dce0f1a))
- add demo content ([3c711af](https://github.com/aaronjoeldev/cashlytics-ai/commit/3c711af32b8d0d1331933fd753ee7d12edb93d0c))
- add drizzle migration to dockerfile ([358fa80](https://github.com/aaronjoeldev/cashlytics-ai/commit/358fa806eccffc28e34ec13388444d8a89f83a79))
- add husky and linting ([34bc351](https://github.com/aaronjoeldev/cashlytics-ai/commit/34bc351eb69f5670ae5d2c103b1b11e62164df0d))
- add logo and favicon ([a65afce](https://github.com/aaronjoeldev/cashlytics-ai/commit/a65afce4a049485423bbdd7858215506cf8e8119))
- add migration for documents table and info columns ([b7a0e1b](https://github.com/aaronjoeldev/cashlytics-ai/commit/b7a0e1b5420272b9471cd80375e65138081147c4))
- add minAmount/maxAmount filter to getDailyExpenses action ([ff552f7](https://github.com/aaronjoeldev/cashlytics-ai/commit/ff552f741ddc5e270e1b0a6f77f1e58cedf8e9d8))
- add new env vars to compose files ([55a7f78](https://github.com/aaronjoeldev/cashlytics-ai/commit/55a7f785ea078a8a6a9e01cffefe41920c9149ef))
- add semiannual (halbjährlich) recurrence type for expenses ([a67bf02](https://github.com/aaronjoeldev/cashlytics-ai/commit/a67bf025bb9414d5a43f6a6dfb286242fd258f0b))
- add smtp functionality ([d0fca70](https://github.com/aaronjoeldev/cashlytics-ai/commit/d0fca707c67a1b867fdf7870a114fc8f4e406061))
- add updateDailyExpense, getTransfers, createTransfer tools and amount filter to getDailyExpenses ([c9b474e](https://github.com/aaronjoeldev/cashlytics-ai/commit/c9b474e0c4389d6ac107aa3a4e856a559675b0f7))
- filter expenses by account ([255ad70](https://github.com/aaronjoeldev/cashlytics-ai/commit/255ad7037e8fc000768dc273ad414a1e2b494139))
- implement all english translations ([f97d7b2](https://github.com/aaronjoeldev/cashlytics-ai/commit/f97d7b26c9f46a6bffff1357b245aabed5b5b86a))
- implement calender view ([4f8c3ba](https://github.com/aaronjoeldev/cashlytics-ai/commit/4f8c3bad97557abf1cf32b299b15e0b62d756d69))
- init cashlytics ([bd23854](https://github.com/aaronjoeldev/cashlytics-ai/commit/bd23854396535253cc8c738a0773b3da02bc2913))
- update demo compose ([2f358f3](https://github.com/aaronjoeldev/cashlytics-ai/commit/2f358f38ef397bb2a23649d06d5aefda6530fb7c))
- update demo seed ([ad23996](https://github.com/aaronjoeldev/cashlytics-ai/commit/ad239962b26bc61a295e2b11f43c4662c47cb1b9))
- update demo seed with testuser ([d2c04a3](https://github.com/aaronjoeldev/cashlytics-ai/commit/d2c04a3340c82559069c8b1bc651e0b22ba641e3))

### 🐛 Bug Fixes

- **02-03:** use npx tsx for migrate-userId script ([38ea9a1](https://github.com/aaronjoeldev/cashlytics-ai/commit/38ea9a186b06149418423d4bb2ed680960fdc179))
- **03-05:** remove orphaned lib/actions/account-actions.ts ([2c133ea](https://github.com/aaronjoeldev/cashlytics-ai/commit/2c133ea3557911115c467f31809d0bb0cec0f773))
- API input validation, prompt injection protection, rate limiting ([0c80d91](https://github.com/aaronjoeldev/cashlytics-ai/commit/0c80d912bfdd039a11faba120b7795380679e332))
- change port of demo stack ([7169daf](https://github.com/aaronjoeldev/cashlytics-ai/commit/7169dafccd8257373e405c3ec42355fba79b4c5e))
- **ci:** add conventional-changelog-conventionalcommits dependency ([da543d8](https://github.com/aaronjoeldev/cashlytics-ai/commit/da543d80b67fb6c20046bbc3ef4838fc7f8b784f))
- **ci:** add conventional-changelog-conventionalcommits dependency ([7451a54](https://github.com/aaronjoeldev/cashlytics-ai/commit/7451a54d2cd869a996971800df3f075771a635c4))
- pass amount filter to action instead of client-side filtering in getDailyExpenses tool ([cdaa89c](https://github.com/aaronjoeldev/cashlytics-ai/commit/cdaa89c69a0b63008d1331794abe8d8f0b3bf127))
- **proxy:** detect secureCookie from x-forwarded-proto/protocol ([fe3d660](https://github.com/aaronjoeldev/cashlytics-ai/commit/fe3d6609bcddd02cf56038a48cada3fce46de3d8))
- **proxy:** exclude static file extensions from matcher ([7bc6499](https://github.com/aaronjoeldev/cashlytics-ai/commit/7bc6499d4b2c5bf78e7fbd17672818073ab3979c))
- **proxy:** move to src/, use function export, getToken for Node.js runtime ([40a1f6d](https://github.com/aaronjoeldev/cashlytics-ai/commit/40a1f6db0ce566989de9bff1738e06e4b18274c9))
- **proxy:** use export default for reliable Turbopack detection, fix redirect to / ([7571e90](https://github.com/aaronjoeldev/cashlytics-ai/commit/7571e90864e677ea67af077d3a839640e3894da2))
- remove content check from chat validation — UIMessage uses parts not content ([e2d11f2](https://github.com/aaronjoeldev/cashlytics-ai/commit/e2d11f2cfdc45d002080e35e4bb6c8e8d8f17306))
- remove orphan translation ([6764c44](https://github.com/aaronjoeldev/cashlytics-ai/commit/6764c44ed963cd04ddbe4760afc4dac718bc7cf9))
- remove unused files ([70ef6e3](https://github.com/aaronjoeldev/cashlytics-ai/commit/70ef6e3ba00dc278f20b993ded40969f11fffb83))
- replace console.error with structured logger across all actions and API routes ([2463e5f](https://github.com/aaronjoeldev/cashlytics-ai/commit/2463e5f55b6518721f4446c08aaee0a31afe2254))
- safeParseFloat utility, parallelize getForecast, UTC date normalization ([d2abfb3](https://github.com/aaronjoeldev/cashlytics-ai/commit/d2abfb35127fdc8617f8cd11cacbeb09c57685f1))
- solve colors not showing in analytics ([e9fcea7](https://github.com/aaronjoeldev/cashlytics-ai/commit/e9fcea79fdf95b097ffb4dbfc201353372519e6d))
- solve dashboard hidden elements ([95acff8](https://github.com/aaronjoeldev/cashlytics-ai/commit/95acff8266ccbb4d41a5a3b885bf290652af4bd0))
- solve demo seeder bug ([9753359](https://github.com/aaronjoeldev/cashlytics-ai/commit/9753359b20d9c9bf7158e57d54f31b1599669ada))
- solve demo seeder error ([0a645a5](https://github.com/aaronjoeldev/cashlytics-ai/commit/0a645a5ccf707b1d86fa80213b706a523fecf824))
- solve migration issue for users ([3f9232f](https://github.com/aaronjoeldev/cashlytics-ai/commit/3f9232f54239972e65a7fb48c9e40cfe7bfe2c52))
- solve migration issue for users ([3cb8418](https://github.com/aaronjoeldev/cashlytics-ai/commit/3cb8418525f9c4e7ab278831020a94921a153a1a))
- solve migration issue for users ([f4f3129](https://github.com/aaronjoeldev/cashlytics-ai/commit/f4f312973ce2b1b6140c5bda320481c75f290277))
- solve missing gh token ([3b61683](https://github.com/aaronjoeldev/cashlytics-ai/commit/3b61683802641e3f44781289055f00e3318adb0f))
- solve missing gh token ([74868ff](https://github.com/aaronjoeldev/cashlytics-ai/commit/74868fff28fd3b6563d200b83db54b91af858bb8))
- update package json ([1b1ee7b](https://github.com/aaronjoeldev/cashlytics-ai/commit/1b1ee7bb256fad2cad97f2550eb10e49ba15079f))

## [0.5.1](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.5.0...v0.5.1) (2026-02-25)

### 🐛 Bug Fixes

- solve demo seeder error ([0a645a5](https://github.com/aaronjoeldev/cashlytics-ai/commit/0a645a5ccf707b1d86fa80213b706a523fecf824))

## [0.5.0](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.4.0...v0.5.0) (2026-02-25)

### ✨ Features

- update demo compose ([2f358f3](https://github.com/aaronjoeldev/cashlytics-ai/commit/2f358f38ef397bb2a23649d06d5aefda6530fb7c))

## [0.4.0](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.3.3...v0.4.0) (2026-02-25)

### ✨ Features

- update demo seed ([ad23996](https://github.com/aaronjoeldev/cashlytics-ai/commit/ad239962b26bc61a295e2b11f43c4662c47cb1b9))

## [0.3.3](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.3.2...v0.3.3) (2026-02-25)

### 🐛 Bug Fixes

- solve migration issue for users ([3f9232f](https://github.com/aaronjoeldev/cashlytics-ai/commit/3f9232f54239972e65a7fb48c9e40cfe7bfe2c52))

## [0.3.2](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.3.1...v0.3.2) (2026-02-25)

### 🐛 Bug Fixes

- solve migration issue for users ([3cb8418](https://github.com/aaronjoeldev/cashlytics-ai/commit/3cb8418525f9c4e7ab278831020a94921a153a1a))

## [0.3.1](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.3.0...v0.3.1) (2026-02-25)

### 🐛 Bug Fixes

- solve migration issue for users ([f4f3129](https://github.com/aaronjoeldev/cashlytics-ai/commit/f4f312973ce2b1b6140c5bda320481c75f290277))

## [0.3.0](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.2.0...v0.3.0) (2026-02-25)

### ✨ Features

- add new env vars to compose files ([55a7f78](https://github.com/aaronjoeldev/cashlytics-ai/commit/55a7f785ea078a8a6a9e01cffefe41920c9149ef))

## [0.2.0](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.1.1...v0.2.0) (2026-02-25)

### ✨ Features

- **01-01:** create API route handler ([3de21a3](https://github.com/aaronjoeldev/cashlytics-ai/commit/3de21a312b61d51e73925a81b1f57b7e0e2d03ae))
- **01-01:** create Auth.js v5 configuration ([eb169af](https://github.com/aaronjoeldev/cashlytics-ai/commit/eb169af33e5b6e1522131ec7636faab605eef1ef))
- **01-01:** create credential validation schemas ([6bea0c0](https://github.com/aaronjoeldev/cashlytics-ai/commit/6bea0c05ec7ea7f06c658a47342f684629870318))
- **01-01:** create password hashing utilities ([1875762](https://github.com/aaronjoeldev/cashlytics-ai/commit/1875762bfa380ed7d65c13d427c7be2814402698))
- **01-02:** create proxy.ts with route protection ([eb8b8b4](https://github.com/aaronjoeldev/cashlytics-ai/commit/eb8b8b414249da9b1881006b272aae2d74d7ea44))
- **01-03:** add app service with AUTH_SECRET to docker-compose ([ccd2d9f](https://github.com/aaronjoeldev/cashlytics-ai/commit/ccd2d9f3fe47e75f41b06a166c0ece2b55de98a0))
- **01-03:** add AUTH_SECRET to .env.example ([25e10f8](https://github.com/aaronjoeldev/cashlytics-ai/commit/25e10f8bcea2b6710c9f47e46d80baa27acdfc78))
- **02-01:** add Auth.js adapter tables with prefixed names ([c1e0025](https://github.com/aaronjoeldev/cashlytics-ai/commit/c1e00251f0ac983f266a0e11714a3b67b672e184))
- **02-01:** add Auth.js tables migration (0004) ([2f8e111](https://github.com/aaronjoeldev/cashlytics-ai/commit/2f8e111879ac9e11090f7e666106a1f7fb424c51))
- **02-01:** configure DrizzleAdapter with custom table names ([7b4579f](https://github.com/aaronjoeldev/cashlytics-ai/commit/7b4579f9298c952a4e5ea3ef9474577793533c97))
- **02-03:** create backfill migration script ([c2e5187](https://github.com/aaronjoeldev/cashlytics-ai/commit/c2e5187fd5753d03b33d39e0990dfe54e9f9240a))
- **02-03:** make userId NOT NULL on all data tables ([980caae](https://github.com/aaronjoeldev/cashlytics-ai/commit/980caae9f4ee7adfdcb9a4eb017f4c031a304fc1))
- **02-04:** update seed-demo.sql with userId columns ([555a20f](https://github.com/aaronjoeldev/cashlytics-ai/commit/555a20f441c26ca5acb98c043380ec09320ecd00))
- **03-01:** create requireAuth helper with AuthResult discriminated union ([79cbaef](https://github.com/aaronjoeldev/cashlytics-ai/commit/79cbaef69ab9df53546e6081644e52ba556b6380))
- **03-02:** refactor accounts-actions.ts with requireAuth and userId filtering ([c527679](https://github.com/aaronjoeldev/cashlytics-ai/commit/c5276795aed2680be4efa5f671df758741f9901e))
- **03-03:** add requireAuth + userId filter + FK validation to expenses-actions and incomes-actions ([4454bed](https://github.com/aaronjoeldev/cashlytics-ai/commit/4454bed3a6afb895f13dc490036b4399acf03c98))
- **03-03:** add requireAuth + userId filter + FK validation to legacy expense, income, and daily-expense actions ([2ad6bf4](https://github.com/aaronjoeldev/cashlytics-ai/commit/2ad6bf496038dafe7af64c5b7c382a33b65340ef))
- **03-04:** refactor conversation-actions, document-actions and documents route with auth ([7479147](https://github.com/aaronjoeldev/cashlytics-ai/commit/7479147f065809b8146d09279804eb83cf139d4c))
- **03-04:** refactor transfer-actions.ts with requireAuth and bidirectional FK validation ([1b24b90](https://github.com/aaronjoeldev/cashlytics-ai/commit/1b24b9071eee032caae1eb3b9fae17c2b85caeff))
- **03-05:** add auth to search and forecast actions ([043f89a](https://github.com/aaronjoeldev/cashlytics-ai/commit/043f89a31d2f4a14e4779faa453da158010cb433))
- **03-05:** add requireAuth and userId filtering to analytics-actions.ts ([59f9212](https://github.com/aaronjoeldev/cashlytics-ai/commit/59f92122ee2bd10f40c164e71ad1f72ce022f1bb))
- **04-01:** add registerSchema to auth validations ([4a3d8f9](https://github.com/aaronjoeldev/cashlytics-ai/commit/4a3d8f98acc90bac2a2e45e3262752dc97c8f87d))
- **04-01:** add SessionProvider to Providers component ([125814b](https://github.com/aaronjoeldev/cashlytics-ai/commit/125814b7da2e778ca4b6bea82606aaded791194f))
- **04-01:** create auth server actions (login, register, logout) ([1458283](https://github.com/aaronjoeldev/cashlytics-ai/commit/1458283022da770cbcaa122b8fe01689b9f9ea3a))
- **04-02:** create (auth) route group layout with split-panel Vault design ([e831dfb](https://github.com/aaronjoeldev/cashlytics-ai/commit/e831dfbdbe28976f0844a468782d8aefe3fa6489))
- **04-02:** create login page and LoginForm client component ([f5a04c1](https://github.com/aaronjoeldev/cashlytics-ai/commit/f5a04c1d6a8205ef5961f3a76eb0838e94eb7505))
- **04-03:** create register page and RegisterForm client component ([33f9412](https://github.com/aaronjoeldev/cashlytics-ai/commit/33f9412a4cc54d1773d044f72eff924a0ce92b96))
- **04-04:** add logout button to sidebar footer ([6bb2ca5](https://github.com/aaronjoeldev/cashlytics-ai/commit/6bb2ca5e5e6733b181667eafad2ce9bef5fd5e83))
- **05-01:** add SINGLE_USER_MODE guard to registerAction ([ed3a350](https://github.com/aaronjoeldev/cashlytics-ai/commit/ed3a3500582122276e322ad28bed54124cc8b200))
- **05-01:** create isRegistrationOpen() utility ([ae95ecd](https://github.com/aaronjoeldev/cashlytics-ai/commit/ae95ecddd71fe0a7966e9e9c7ee098fa36598a01))
- **05-02:** add server-side redirect to register page ([32789dc](https://github.com/aaronjoeldev/cashlytics-ai/commit/32789dc517ede1d18fa80104eed2b04cc5e11915))
- **06-01:** add passwordResetTokens table to schema ([4de4672](https://github.com/aaronjoeldev/cashlytics-ai/commit/4de4672a2d370ebbecc0296045c05dbc7c9b404d))
- **06-01:** generate and apply migration for password_reset_tokens ([df8b1e7](https://github.com/aaronjoeldev/cashlytics-ai/commit/df8b1e7d9e9c9930b665d071cd2cfb2d27d03521))
- **07-01:** create email transporter module with lazy singleton ([4055d4a](https://github.com/aaronjoeldev/cashlytics-ai/commit/4055d4a79a7f3d2f83f7c1daf3713d7fe290d394))
- **07-02:** add SMTP and APP_URL environment variables to docker-compose ([6324d09](https://github.com/aaronjoeldev/cashlytics-ai/commit/6324d09e61ed17eee6d101d4ece06afbc1e747fc))
- **08-01:** create reset password email template ([eaab32f](https://github.com/aaronjoeldev/cashlytics-ai/commit/eaab32f7d77dc7ad6ea41dc421f8d2464bfcb04a))
- **08-01:** create Vault-branded base email template ([32e2b34](https://github.com/aaronjoeldev/cashlytics-ai/commit/32e2b34edef26d0c9fa15b742979d43ca4a86d0a))
- **08-02:** create email index with render functions ([6b6dc6c](https://github.com/aaronjoeldev/cashlytics-ai/commit/6b6dc6cb60d571144447390c79ebe569984804ba))
- **08-02:** create welcome email template ([41d4f83](https://github.com/aaronjoeldev/cashlytics-ai/commit/41d4f83718253d9cee64d71b45abbbe0decaacaa))
- **09-01:** create reset token generation and hashing utilities ([c6967ab](https://github.com/aaronjoeldev/cashlytics-ai/commit/c6967abf98a4a1c916c90692b24ae9e7a4a3a05e))
- **09-02:** add token lifecycle DB operations ([c4006a1](https://github.com/aaronjoeldev/cashlytics-ai/commit/c4006a1ef46a16cef18f4e6ebf1c923b72ce2c8e))
- **10-01:** add forgotPasswordAction with email enumeration prevention ([0e24ad3](https://github.com/aaronjoeldev/cashlytics-ai/commit/0e24ad3644a8e491ddd20225eb8b26c01db30f23))
- **10-02:** add resetPasswordAction server action ([be75e9e](https://github.com/aaronjoeldev/cashlytics-ai/commit/be75e9e35463e0982a50f96c83d9a9063f7732e7))
- **11-01:** create forgot-password page route ([9b0a2d3](https://github.com/aaronjoeldev/cashlytics-ai/commit/9b0a2d3bd0b6b26e32a32dd99d8e6cf7ee233f85))
- **11-01:** create ForgotPasswordForm component ([77b8013](https://github.com/aaronjoeldev/cashlytics-ai/commit/77b8013409f4f0d36541eed75a749f171a949baa))
- **11-02:** create reset-password page route with Suspense ([ee658d0](https://github.com/aaronjoeldev/cashlytics-ai/commit/ee658d06e7b37e916a59b0a64cb9b389b8500cb4))
- **11-02:** create ResetPasswordForm component ([eeb9ce4](https://github.com/aaronjoeldev/cashlytics-ai/commit/eeb9ce47bc4dbd87759b4b1a326d1d6d4fc0eefe))
- **11-03:** add Forgot password link to login form ([ca41e6b](https://github.com/aaronjoeldev/cashlytics-ai/commit/ca41e6b281b58d84a75364f547ee8bfa8b1ab50d))
- **11-03:** add post-reset toast and email pre-fill to login ([2c5b527](https://github.com/aaronjoeldev/cashlytics-ai/commit/2c5b52739847f6f25cbc795258dba38291deea8b))
- **12-01:** integrate welcome email in registerAction ([61d364d](https://github.com/aaronjoeldev/cashlytics-ai/commit/61d364da56fd9f726fc60f3c9140523df0c1495a))
- add smtp functionality ([d0fca70](https://github.com/aaronjoeldev/cashlytics-ai/commit/d0fca707c67a1b867fdf7870a114fc8f4e406061))
- update demo seed with testuser ([d2c04a3](https://github.com/aaronjoeldev/cashlytics-ai/commit/d2c04a3340c82559069c8b1bc651e0b22ba641e3))

### 🐛 Bug Fixes

- **02-03:** use npx tsx for migrate-userId script ([38ea9a1](https://github.com/aaronjoeldev/cashlytics-ai/commit/38ea9a186b06149418423d4bb2ed680960fdc179))
- **03-05:** remove orphaned lib/actions/account-actions.ts ([2c133ea](https://github.com/aaronjoeldev/cashlytics-ai/commit/2c133ea3557911115c467f31809d0bb0cec0f773))
- **proxy:** detect secureCookie from x-forwarded-proto/protocol ([fe3d660](https://github.com/aaronjoeldev/cashlytics-ai/commit/fe3d6609bcddd02cf56038a48cada3fce46de3d8))
- **proxy:** exclude static file extensions from matcher ([7bc6499](https://github.com/aaronjoeldev/cashlytics-ai/commit/7bc6499d4b2c5bf78e7fbd17672818073ab3979c))
- **proxy:** move to src/, use function export, getToken for Node.js runtime ([40a1f6d](https://github.com/aaronjoeldev/cashlytics-ai/commit/40a1f6db0ce566989de9bff1738e06e4b18274c9))
- **proxy:** use export default for reliable Turbopack detection, fix redirect to / ([7571e90](https://github.com/aaronjoeldev/cashlytics-ai/commit/7571e90864e677ea67af077d3a839640e3894da2))
- update package json ([1b1ee7b](https://github.com/aaronjoeldev/cashlytics-ai/commit/1b1ee7bb256fad2cad97f2550eb10e49ba15079f))

## [0.1.1](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.1.0...v0.1.1) (2026-02-23)

### 🐛 Bug Fixes

- remove unused files ([70ef6e3](https://github.com/aaronjoeldev/cashlytics-ai/commit/70ef6e3ba00dc278f20b993ded40969f11fffb83))

## [0.8.0](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.7.0...v0.8.0) (2026-02-23)

### ✨ Features

- add husky and linting ([34bc351](https://github.com/aaronjoeldev/cashlytics-ai/commit/34bc351eb69f5670ae5d2c103b1b11e62164df0d))

## [0.7.0](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.6.0...v0.7.0) (2026-02-23)

### ✨ Features

- filter expenses by account ([255ad70](https://github.com/aaronjoeldev/cashlytics-ai/commit/255ad7037e8fc000768dc273ad414a1e2b494139))

## [0.6.0](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.5.0...v0.6.0) (2026-02-23)

### ✨ Features

- add automatic migration service to self-host docker compose ([199e692](https://github.com/aaronjoeldev/cashlytics-ai/commit/199e692eefdb7cc5c7ff1b1ab64e018e9dce0f1a))

## [0.5.0](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.4.2...v0.5.0) (2026-02-23)

### ✨ Features

- add minAmount/maxAmount filter to getDailyExpenses action ([ff552f7](https://github.com/aaronjoeldev/cashlytics-ai/commit/ff552f741ddc5e270e1b0a6f77f1e58cedf8e9d8))
- add semiannual (halbjährlich) recurrence type for expenses ([a67bf02](https://github.com/aaronjoeldev/cashlytics-ai/commit/a67bf025bb9414d5a43f6a6dfb286242fd258f0b))
- add updateDailyExpense, getTransfers, createTransfer tools and amount filter to getDailyExpenses ([c9b474e](https://github.com/aaronjoeldev/cashlytics-ai/commit/c9b474e0c4389d6ac107aa3a4e856a559675b0f7))

### 🐛 Bug Fixes

- pass amount filter to action instead of client-side filtering in getDailyExpenses tool ([cdaa89c](https://github.com/aaronjoeldev/cashlytics-ai/commit/cdaa89c69a0b63008d1331794abe8d8f0b3bf127))

## [0.4.2](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.4.1...v0.4.2) (2026-02-23)

### 🐛 Bug Fixes

- API input validation, prompt injection protection, rate limiting ([0c80d91](https://github.com/aaronjoeldev/cashlytics-ai/commit/0c80d912bfdd039a11faba120b7795380679e332))
- remove content check from chat validation — UIMessage uses parts not content ([e2d11f2](https://github.com/aaronjoeldev/cashlytics-ai/commit/e2d11f2cfdc45d002080e35e4bb6c8e8d8f17306))
- replace console.error with structured logger across all actions and API routes ([2463e5f](https://github.com/aaronjoeldev/cashlytics-ai/commit/2463e5f55b6518721f4446c08aaee0a31afe2254))
- safeParseFloat utility, parallelize getForecast, UTC date normalization ([d2abfb3](https://github.com/aaronjoeldev/cashlytics-ai/commit/d2abfb35127fdc8617f8cd11cacbeb09c57685f1))

## [0.4.1](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.4.0...v0.4.1) (2026-02-21)

### 🐛 Bug Fixes

- remove orphan translation ([6764c44](https://github.com/aaronjoeldev/cashlytics-ai/commit/6764c44ed963cd04ddbe4760afc4dac718bc7cf9))

## [0.4.0](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.3.2...v0.4.0) (2026-02-19)

### ✨ Features

- implement all english translations ([f97d7b2](https://github.com/aaronjoeldev/cashlytics-ai/commit/f97d7b26c9f46a6bffff1357b245aabed5b5b86a))

### 🐛 Bug Fixes

- solve colors not showing in analytics ([e9fcea7](https://github.com/aaronjoeldev/cashlytics-ai/commit/e9fcea79fdf95b097ffb4dbfc201353372519e6d))

## [0.3.2](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.3.1...v0.3.2) (2026-02-18)

### 🐛 Bug Fixes

- solve demo seeder bug ([9753359](https://github.com/aaronjoeldev/cashlytics-ai/commit/9753359b20d9c9bf7158e57d54f31b1599669ada))

## [0.3.1](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.3.0...v0.3.1) (2026-02-18)

### 🐛 Bug Fixes

- change port of demo stack ([7169daf](https://github.com/aaronjoeldev/cashlytics-ai/commit/7169dafccd8257373e405c3ec42355fba79b4c5e))

## [0.3.0](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.2.0...v0.3.0) (2026-02-18)

### ✨ Features

- add demo content ([3c711af](https://github.com/aaronjoeldev/cashlytics-ai/commit/3c711af32b8d0d1331933fd753ee7d12edb93d0c))

## [0.2.0](https://github.com/aaronjoeldev/cashlytics-ai/compare/v0.1.0...v0.2.0) (2026-02-18)

### ✨ Features

- implement calender view ([4f8c3ba](https://github.com/aaronjoeldev/cashlytics-ai/commit/4f8c3bad97557abf1cf32b299b15e0b62d756d69))

## [0.1.0] (2026-02-18) - Initial Public Release

### ✨ Features

- Initial release of Cashlytics AI
- Dashboard with financial overview
- Expense tracking and management
- Income tracking and management
- Account management
- Analytics and reporting
- AI-powered assistant
- Category management
- Multi-language support (DE/EN)
- Dark/Light theme support
- File upload to expenses
- Drizzle migration in Dockerfile
- Logo and favicon
