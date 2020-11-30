#!/usr/bin/env node
/* eslint-disable no-console */

import program from 'commander';
import downloadPage from '../src/index.js';

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

program.parseAsync(process.argv).then(() => {
  // eslint-disable-next-line no-underscore-dangle
  const [result] = program._actionResults;
  return result;
})
  .then((fileName) => {
    console.log(`\nPage was downloaded as '${fileName}'`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Oops! Something went wrong');
    if (error.isAxiosError) {
      const { response } = error;
      console.log('status-code: ', response.status);
      console.log('status-text: ', response.statusText);
      console.log('error.message: ', error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  });
