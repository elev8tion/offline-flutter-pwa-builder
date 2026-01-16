# Repository Guidelines

## Project Structure & Module Organization
This MCP server is TypeScript/Node.js. Key paths:
- `src/index.ts`: server entrypoint and module registration.
- `src/core/`: project engine, template engine, module system, validation, filesystem.
- `src/modules/`: feature modules (drift, pwa, state, security, build, design, github).
- `src/tools/` and `src/resources/`: MCP tool and resource definitions.
- `tests/`: Jest tests (one module per `*.test.ts` file).
- `dist/`: build output (generated).
- `docs/` and `mcp_server_structure`: architectural references/specs.

## Build, Test, and Development Commands
- `npm run build`: compile TypeScript to `dist/`.
- `npm run dev`: watch-mode TypeScript builds.
- `npm run start`: run the MCP server from `dist/index.js`.
- `npm test`: run Jest test suite.
- `npm run test:watch`: watch tests.
- `npm run lint`: run ESLint on `src/**/*.ts`.
- `npm run clean`: remove `dist/`.

## Coding Style & Naming Conventions
- TypeScript ESM (`"type": "module"`); use explicit `.js` in imports.
- Match existing style: 2-space indentation, double quotes, semicolons.
- Keep modules organized under `src/modules/<module>/` with matching exports.
- Prefer descriptive tool names mirroring MCP tool IDs (e.g., `project_build`).

## Testing Guidelines
- Framework: Jest with `ts-jest` (ESM).
- Tests live in `tests/` and must match `**/tests/**/*.test.ts`.
- Coverage collected from `src/**/*.ts` into `coverage/`.
- Keep unit tests focused per module; add regression tests for new tools.

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, and descriptive (e.g., “Add drift sync hooks”).
- Optional phase prefixes appear in history (e.g., “Phase 3B: …”) when applicable.
- PRs should include: summary, tests run, and any docs updates (README/CLAUDE).
- Link related issues if available; include screenshots only for UI/doc changes.

## Agent-Specific Notes
- Review `CLAUDE.md` for MCP architecture and the mandatory GitHub import rule.
- Node.js >= 18 is required (`package.json` engines).
