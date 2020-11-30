import { promises as fsp } from 'fs';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';
import Listr from 'listr';
import debug from 'debug';
import 'axios-debug-log';

const log = debug('page-loader:');
const noop = () => {};

const buildName = (link) => {
  const { pathname, host } = new URL(link);
  const fileName = `${host}${pathname}`
    .split(/[^\w+]/gi)
    .join('-');
  return fileName;
};

const buildAssetName = (rootAddress, link) => {
  const extName = path.extname(link);
  const [linkWithoutExtName] = link.match(new RegExp(`.+(?=${extName})`));
  const name = buildName(new URL(linkWithoutExtName, rootAddress));
  const nameWithExtName = name.concat(extName || '.html');
  return nameWithExtName;
};

const getPageData = (html, rootAddress, assetsDirectoryName) => {
  const links = [];
  const $ = cheerio.load(html, {
    normalizeWhitespace: true,
    decodeEntities: false,
  });
  const mapping = {
    link: 'href',
    img: 'src',
    script: 'src',
  };
  const { host: rootHost } = new URL(rootAddress);

  Object.entries(mapping)
    .forEach(([tagName, attributeName]) => {
      const elements = $(tagName).toArray();
      elements
        .map(({ attribs }, index) => ({ link: attribs[attributeName], index }))
        .map(({ link, index }) => {
          const { host, href } = new URL(link, rootAddress);
          return { href, host, index };
        })
        .filter(({ host }) => host === rootHost)
        .forEach(({ href, index }) => {
          links.push(href);
          const assetName = buildAssetName(rootAddress, href);
          $(elements[index]).attr(attributeName, path.join(assetsDirectoryName, assetName));
        });
    });

  return { html: $.html(), links };
};

const downloadAsset = (link, directoryPath, assetName) => axios
  .get(link, { responseType: 'arraybuffer' })
  .then(({ data }) => {
    const assetPath = path.join(directoryPath, assetName);
    return fsp.writeFile(assetPath, data);
  });

const downloadPage = (address, outputDirectory = process.cwd()) => {
  const rootName = buildName(address);
  const fileExtension = '.html';
  const fileName = rootName.concat(fileExtension);
  const filePath = path.join(outputDirectory, fileName);
  const assetsDirectoryNamePostfix = '_files';
  const assetsDirectoryName = rootName.concat(assetsDirectoryNamePostfix);
  const assetsDirectoryPath = path.join(outputDirectory, assetsDirectoryName);
  let pageData;

  return axios.get(address)
    .then(({ data }) => {
      pageData = getPageData(data, address, assetsDirectoryName);
      log(`creating an html file: ${filePath}`);
      return fsp.writeFile(filePath, pageData.html);
    })
    .then(() => {
      log(`creating a directory for web page assets: ${assetsDirectoryPath}`);
      return fsp.mkdir(assetsDirectoryPath);
    })
    .then(() => {
      const tasks = pageData.links.map((link) => ({
        title: link,
        task: () => {
          const assetName = buildAssetName(address, link);
          return downloadAsset(link, assetsDirectoryPath, assetName).catch(noop);
        },
      }));
      const listr = new Listr(tasks, { concurrent: true });
      return listr.run();
    })
    .then(() => fileName);
};

export default downloadPage;
