#!/usr/bin/env -S pnpm tsx

import oclif from "@oclif/core";

// In dev mode -> use ts-node and dev plugins
process.env.NODE_ENV = "development";

// In dev mode, always show stack traces
oclif.settings.debug = true;

// Start the CLI
oclif
  .run(process.argv.slice(2), import.meta.url)
  .then(oclif.flush)
  .catch(oclif.Errors.handle);
