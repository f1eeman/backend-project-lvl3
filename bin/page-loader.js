#!/usr/bin/env node
/* eslint-disable no-console */

import pageLoaderCli from '../src/cli.js';

pageLoaderCli()
  // eslint-disable-next-line no-console
  .then((fileName) => console.log(`\nPage was downloaded as '${fileName}'`))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Oops! Something went wrong');
    if (error.code) {
      console.error(error);
      return;
    }
    const { response } = error;
    console.log('status-code: ', response.status);
    console.log('status-text: ', response.statusText);
    console.log('The requested page is unavailable or does not exist. Check that the address is correct');
    process.exit(1);
  });
