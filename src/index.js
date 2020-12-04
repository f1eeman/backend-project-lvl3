import _ from 'lodash';
import { promises as fsp } from 'fs';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';
import Listr from 'listr';
import debug from 'debug';
import 'axios-debug-log';

const log = debug('page-loader:');

const buildName = (link) => {
  const { pathname, host } = new URL(link);
  const fileName = `${host}${pathname}`
    .split(/[^\w+]/gi)
    .filter((el) => el !== '')
    .join('-');
  return fileName;
};

const buildAssetName = (rootAddress, link) => {
  const { dir, name, ext } = path.parse(link);
  const assetNameWithoutExtName = buildName(new URL(`${dir}/${name}`, rootAddress));
  const assetNameWithExtName = assetNameWithoutExtName.concat(ext || '.html');
  return assetNameWithExtName;
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
          log(`asset: ${assetName}, ${link}`);
          return downloadAsset(link, assetsDirectoryPath, assetName).catch(_.noop);
        },
      }));
      const listr = new Listr(tasks, { concurrent: true });
      return listr.run();
    })
    .then(() => fileName);
};

export default downloadPage;
