import axios from 'axios';
import url from 'url';
import fs, { promises as fsp } from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import prettier from 'prettier';

const getPath = (catalog, fileName) => path.join(catalog, fileName);
const createName = (link) => {
  const { path: fullPath, host } = url.parse(link);
  const fileName = `${host}${fullPath}`
    .split(/[^A-Za-z0-9]/)
    .filter((el) => el !== '')
    .join('-');
  return fileName;
};
const modifyName = (name, value) => name.concat(value);

const downloadImages = (html, directoryPath, resourcesDirectoryName) => {
  const $ = cheerio.load(html, {
    normalizeWhitespace: true,
    decodeEntities: false,
  });
  $('img').each((i, el) => {
    const link = $(el).attr('src');
    // eslint-disable-next-line no-useless-escape
    const [imageName] = link.match(/([^\/]+)\/?$/);
    const imageExtensions = /(jpg|jpeg|svg|webp|png|gif)/;
    const newImageName = imageExtensions.test(imageName) ? imageName : imageName.concat('.jpg');
    $(el).attr('src', getPath(resourcesDirectoryName, newImageName));
    axios({
      method: 'get',
      url: link,
      responseType: 'arraybuffer',
    })
      .then(({ data }) => {
        const imagePath = getPath(directoryPath, newImageName);
        return fsp.writeFile(imagePath, data);
      });
  });
  const formattedHtml = prettier.format($.html(), { parser: 'html' });
  return formattedHtml;
};

const downloadPage = (address, directory) => axios.get(address)
  .then(({ data }) => {
    const rootName = createName(address);
    const htmlExtension = '.html';
    const htmlName = modifyName(rootName, htmlExtension);
    const htmlPath = getPath(directory, htmlName);
    const pageResourcesDirectoryNameLastWord = '_files';
    const pageResourcesDirectoryName = modifyName(rootName, pageResourcesDirectoryNameLastWord);
    const pageResourcesDirectoryPath = getPath(directory, pageResourcesDirectoryName);
    return {
      data,
      htmlPath,
      pageResourcesDirectoryPath,
      pageResourcesDirectoryName,
    };
  })
  .then(({
    data,
    htmlPath,
    pageResourcesDirectoryPath,
    pageResourcesDirectoryName,
  }) => fsp.access(pageResourcesDirectoryPath, fs.constants.F_OK)
    .catch((e) => {
      if (e.code === 'ENOENT') {
        return fsp.mkdir(pageResourcesDirectoryPath, { recursive: true });
      }
      throw e;
    })
    .then(() => downloadImages(data, pageResourcesDirectoryPath, pageResourcesDirectoryName))
    .then((newHtml) => fsp.writeFile(htmlPath, newHtml)))
  .then(() => console.log('Operation has finished'));

export default downloadPage;
