import { promises as fsp } from 'fs';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';
import Listr from 'listr';
import debug from 'debug';
import 'axios-debug-log';

const log = debug('page-loader:');

const getPath = (catalog, fileName) => path.join(catalog, fileName);

const buildName = (link) => {
  const { pathname, host } = new URL(link);
  const fileName = `${host}${pathname}`
    .split(/[^A-Za-z0-9]/)
    .filter((el) => el !== '')
    .join('-');
  return fileName;
};

const buildAssetName = (rootAddress, link) => {
  const { pathname, host } = new URL(link, rootAddress);
  const name = `${host}/${pathname}`
    .split(/[^A-Za-z0-9]/)
    .filter((el) => el !== '')
    .join('-');
  const regexp = /.+(jpg|jpeg|svg|webp|png|gif|ico|css|js)/;
  const [assetName] = name.match(regexp) || [name.concat('-html')];
  const indexLastDash = assetName.lastIndexOf('-');
  const newName = `${assetName.slice(0, indexLastDash)}.${assetName.slice(indexLastDash + 1)}`;
  return newName;
};

const modifyName = (name, value) => name.concat(value);

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

  // Object.entries(mapping)
  //   .forEach(([tagName, attributeName]) => {
  //     const elements = $(tagName).toArray();
  //     elements
  //       .map(({ attribs }, index) => attribs[attributeName])
  //       .map((link) => {
  //         // console.log('maaaaaaaaaaaaaaaap Link', link);
  //         return new URL(link, rootAddress);
  //       })
  //       .filter(({ host }) => {
  //         return host === rootHost;
  //       })
  //       .map(({ href }) => href)
  //       .forEach((link) => {
  //         // console.log('!!!!!!!!!!!!link', link);
  //         links.push(link);
  //         const assetName = buildAssetName(rootAddress, link);
  //         $(tagName).attr(attributeName, path.join(assetsDirectoryName, assetName));
  //       });
  //   });

  Object.entries(mapping)
    .forEach(([tagName, attributeName]) => {
      const elements = $(tagName).toArray();
      elements
        .map(({ attribs }, index) => ({ link: attribs[attributeName], index }))
        .map(({ link, index }) => {
          // console.log('maaaaaaaaaaaaaaaap Link', link);
          const { host, href } = new URL(link, rootAddress);
          return { href, host, index };
        })
        .filter(({ host }) => host === rootHost)
        .forEach(({ href, index }) => {
          // console.log('!!!!!!!!!!!!link', link);
          links.push(href);
          const assetName = buildAssetName(rootAddress, href);
          $(elements[index]).attr(attributeName, path.join(assetsDirectoryName, assetName));
        });
    });

  // console.log('links', links);

  return { html: $.html(), links };
};

const downloadAsset = (link, directoryPath, assetName) => axios
  .get(link, { responseType: 'arraybuffer' })
  .then(({ data }) => {
    const assetPath = getPath(directoryPath, assetName);
    return fsp.writeFile(assetPath, data);
  });

const downloadPage = (address, outputDirectory) => {
  const rootName = buildName(address);
  const htmlExtension = '.html';
  const htmlName = modifyName(rootName, htmlExtension);
  const htmlPath = getPath(outputDirectory, htmlName);
  const assetsDirectoryNamePostfix = '_files';
  const assetsDirectoryName = modifyName(rootName, assetsDirectoryNamePostfix);
  const assetsDirectoryPath = getPath(outputDirectory, assetsDirectoryName);
  let pageData;

  return axios.get(address)
    .then(({ data }) => {
      pageData = getPageData(data, address, assetsDirectoryName);
      log(`creating an html file: ${htmlPath}`);
      return fsp.writeFile(htmlPath, pageData.html);
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
          return downloadAsset(link, assetsDirectoryPath, assetName);
        },
      }));
      const listr = new Listr(tasks, { concurrent: true });
      return listr.run();
    })
    .then(() => htmlName);
};

export default downloadPage;
