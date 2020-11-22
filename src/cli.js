import program from 'commander';
import downloadPage from './index.js';

const showCliInfo = async () => {
  program
    .version('0.0.1')
    .description('Downloads pages from the Internet and saves them to your computer')
    .option('--output [path]', 'directory for data downloading', `${process.cwd()}`)
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

export default showCliInfo;
