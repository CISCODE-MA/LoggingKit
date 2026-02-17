## Infra layer: Winston-based logging implementation

Contains:

- `transports.ts` - Creates Winston transports (Console, File, HTTP)
- `logger.factory.ts` - Factory for creating Logger instances

### Dependency rules:

- May depend on `core/`
- Must not be imported by consumers directly
- Expose anything public via `src/index.ts` only

### Transports supported:

- **Console** - colorized in development, JSON in production
- **File** - daily rotating log files via `winston-daily-rotate-file`
- **HTTP** - for external services like Dynatrace
