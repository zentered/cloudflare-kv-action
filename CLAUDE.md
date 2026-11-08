# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

GitHub Action for GET/PUT/DELETE operations on Cloudflare Workers KV storage.
Entry point is `index.js` which reads action inputs, core logic is in
`cloudflare.js` which calls the Cloudflare API. Without the `operation` input
the action infers it: if `value` is provided it PUTs, otherwise it GETs and
returns the value as output. A GET on a missing key fails the step unless
`fail_on_missing` is `false`, which gives an empty output. Only the
key-not-found 404 counts as missing.

Auth supports both legacy (API Key + Email) and modern (Bearer token) methods.

## Commands

```bash
npm run lint          # ESLint (flat config, eslint.config.js)
npm test              # node:test (unit tests always run; integration tests need .env)
npm run prepare       # Bundle with @vercel/ncc → dist/
npm run build         # lint + test + prepare (full pipeline)
```

Unit tests run without credentials. Integration tests require a `.env` file
with: `CLOUDFLARE_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`,
`CLOUDFLARE_NAMESPACE_IDENTIFIER`. Copy `.env.example` to `.env` and fill in
values to run integration tests.

## Architecture

- **ESM project** (`"type": "module"`) — use `import`, not `require`
- `@actions/core` uses namespace import: `import * as core from '@actions/core'`
- `dist/` is committed — GitHub Actions runs from it. Always rebuild after code
  changes.
- Action runtime: `node24` (defined in `action.yml`)
- Bundled with `@vercel/ncc` which inlines all dependencies into a single file

## Code Style

Enforced by pre-commit hooks (husky + lint-staged):

- Prettier: single quotes, no semicolons, no trailing commas
- ESLint v9 flat config with `eslint-plugin-n` and `eslint-plugin-json`
- Conventional commits enforced by commitlint

## Release Process

Semantic-release runs on push to `main` — commit messages determine version
bumps (`fix:` → patch, `feat:` → minor, `BREAKING CHANGE:` footer → major).
