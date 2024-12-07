#!/usr/bin/env -S pnpm tsx

import oclif from "@oclif/core";

await oclif.execute({dir: import.meta.url});
