#!/usr/bin/env node
/* eslint-disable no-console */

import program from 'commander';
import downloadPage from '../src/index.js';

program
  .version('0.0.1')
  .description('Downloads pages from the Internet and saves them to your computer')
  .option('-o, --output [path]', 'directory for data downloading', process.cwd())
  .arguments('<address>')
  .action((address) => downloadPage(address, program.output)
    .then((fileName) => {
      console.log(`\nPage was downloaded as '${fileName}'`);
      process.exit();
    })
    .catch((error) => {
      console.error('Oops! Something went wrong');
      if (error.isAxiosError) {
        const { response } = error;
        console.error('status-code: ', response.status);
        console.log('status-text: ', response.statusText);
        console.log('error.message: ', error.message);
      } else {
        console.error(error);
      }
      process.exit(1);
    }));

program.parse(process.argv);
