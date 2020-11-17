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
  .then(() => axios({
    method: 'get',
    url: address,
    responseType: 'arraybuffer',
  }))
  .then((res) => {
    console.log('res.data', res.data.toString());
  });

export default downloadPage;

downloadPage('https://cdn2.hexlet.io/assets/professions/layout-designer-f4be6342813b9cc4ec9c0b33e37b5b9e455bf8a5edccb1f39adb0c66fb4c3c74.svg', '/tmp/dir');
