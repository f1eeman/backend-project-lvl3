import program from 'commander';
import downloadPage from './index.js';

const showCliInfo = () => {
  program
    .version('0.0.1')
    .description('Downloads pages from the Internet and saves them to your computer')
    .option('--output [path]', 'directory for data downloading', `${process.cwd()}`)
    .arguments('<address>')
    .action((address) => {
      if (program.output === process.cwd()) {
        downloadPage(address, program.output);
      } else {
        downloadPage(address, `${process.cwd()}${program.output}`);
      }
    });
  program.parse(process.argv);
};

export default showCliInfo;
