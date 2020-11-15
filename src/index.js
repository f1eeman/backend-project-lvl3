import axios from 'axios';
import url from 'url';
import fs, { promises as fsp } from 'fs';
import path from 'path';

const getFilePath = (catalog, fileName) => path.join(catalog, fileName);
const createFileName = (link) => {
  const { path: fullPath, host } = url.parse(link);
  const fileName = `${host}${fullPath}`
    .split(/[^A-Za-z0-9]/)
    .join('-')
    .concat('.html');
  return fileName;
};
const downloadPage = (address, directory) => fsp.access(directory, fs.constants.F_OK)
  .catch((e) => {
    if (e.code === 'ENOENT') {
      return fsp.mkdir(directory, { recursive: true });
    }
    throw e;
  })
  .then(() => axios.get(address))
  .then(({ data }) => {
    const fileName = createFileName(address);
    const filePath = getFilePath(directory, fileName);
    fsp.writeFile(filePath, data);
    console.log('Operation has finished');
  });

export default downloadPage;
