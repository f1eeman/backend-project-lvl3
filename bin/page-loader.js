#!/usr/bin/env node
/* eslint-disable no-console */

import program from 'commander';
import downloadPage from '../src/index.js';

const pageLoaderCli = async () => {
  program
    .version('0.0.1')
    .description('Downloads pages from the Internet and saves them to your computer')
    .option('-o, --output [path]', 'directory for data downloading', `${process.cwd()}`)
    .arguments('<address>')
    .action(async (address) => {
      if (program.output === process.cwd()) {
        return downloadPage(address, program.output);
      }
      return downloadPage(address, `${process.cwd()}${program.output}`);
    });
  return program.parseAsync(process.argv).then(() => {
    // eslint-disable-next-line no-underscore-dangle
    const [result] = program._actionResults;
    return result;
  });
};

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
