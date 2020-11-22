#!/usr/bin/env node

import pageLoaderCli from '../src/cli.js';

pageLoaderCli()
  // eslint-disable-next-line no-console
  .then((fileName) => console.log(`\nPage was downloaded as '${fileName}'`))
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
