/* eslint-disable no-console */
import axios from 'axios';
import url from 'url';
import { promises as fsp } from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import prettier from 'prettier';
// import debug from 'debug';
// import 'axios-debug-log';
import Listr from 'listr';

const imageExtentsions = /(jpg|jpeg|svg|webp|png|gif|ico)/;

const getPath = (catalog, fileName) => path.join(catalog, fileName);

const createName = (link) => {
  const { path: fullPath, host } = url.parse(link, true);
  const fileName = `${host}${fullPath}`
    .split(/[^A-Za-z0-9]/)
    .filter((el) => el !== '')
    .join('-');
  return fileName;
};

const createAssetName = (address, link) => {
  const { pathname } = url.parse(link, true);
  const { host } = url.parse(address, true);
  const name = `${host}/${pathname}`
    .split(/[^A-Za-z0-9]/)
    .filter((el) => el !== '')
    .join('-');
  const regexp = /.+(jpg|jpeg|svg|webp|png|gif|ico|css|js)/;
  const [resourceName] = name.match(regexp) || [name.concat('-html')];
  const indexLastDash = resourceName.lastIndexOf('-');
  const newName = `${resourceName.slice(0, indexLastDash)}.${resourceName.slice(indexLastDash + 1)}`;
  return newName;
};

const modifyName = (name, value) => name.concat(value);

const isRelativePath = (link) => {
  const { protocol } = url.parse(link, true);
  return protocol === null;
};

const isLocalResource = (address, link) => {
  const { host } = url.parse(link, true);
  const { host: rootHost } = url.parse(address, true);
  console.log('isLocalResource address', address);
  console.log('isLocalResource rootHost', rootHost);
  console.log('isLocalResource link', link);
  console.log('isLocalResource HOST', host);
  return host === rootHost;
};

const createAbsolutelyPath = (root, link) => {
  const linkData = url.parse(link, true);
  const rootData = url.parse(root, true);
  return url.format({ ...rootData, path: linkData.path, pathname: linkData.pathname });
};

const modifyHtml = (html, resourcesDirectoryName, address) => {
  const $ = cheerio.load(html, {
    normalizeWhitespace: true,
    decodeEntities: false,
  });
  const changeAttributeValue = (tagElement, ref, property) => {
    const resourceName = createAssetName(address, ref);
    $(tagElement).attr(property, getPath(resourcesDirectoryName, resourceName));
  };
  $('link').each((i, tag) => {
    const attribute = 'href';
    const link = $(tag).attr(attribute);
    if (isRelativePath(link) || isLocalResource(address, link)) {
      changeAttributeValue(tag, link, attribute);
    }
  });
  $('script').each((i, tag) => {
    const attribute = 'src';
    const link = $(tag).attr(attribute);
    if (isRelativePath(link) || isLocalResource(address, link)) {
      changeAttributeValue(tag, link, attribute);
    }
  });
  $('img').each((i, tag) => {
    const attribute = 'src';
    const link = $(tag).attr(attribute);
    changeAttributeValue(tag, link, attribute);
  });
  const formattedHtml = prettier.format($.html(), { parser: 'html', requirePragma: true });
  return $.html();
};

const getLinks = (html, address) => {
  const $ = cheerio.load(html, {
    normalizeWhitespace: true,
    decodeEntities: false,
  });
  const imagesElements = $('img').toArray();
  const scriptsElements = $('script').toArray();
  const linksElements = $('link').toArray();
  const imagesLinks = imagesElements
    .map(({ attribs }) => attribs.src)
    .filter((link) => isRelativePath(link) || isLocalResource(address, link))
    .map((link) => createAbsolutelyPath(address, link));
  const scriptsLinks = scriptsElements
    .map(({ attribs }) => attribs.src)
    .filter((link) => isLocalResource(address, link))
    .map((link) => createAbsolutelyPath(address, link));
  const otherLinks = linksElements
    .map(({ attribs }) => attribs.href)
    .filter((link) => {
      console.log('getLINKS___OTHER', link);
      console.log('getLINKS___OTHER', address);
      console.log('getLINKS isLocalResource(address, link)', isLocalResource(address, link));
      console.log('getLINKS isRelativePath(link)', isRelativePath(link));
      return isRelativePath(link) || isLocalResource(address, link);
    })
    .map((link) => createAbsolutelyPath(address, link));
  const sharedLinks = [...imagesLinks, ...scriptsLinks, ...otherLinks];
  console.log('otherLinks', otherLinks);
  return sharedLinks;
};

const downloadAsset = (link, directoryPath, resourceName) => {
  console.log('downloadAsset____link', link);
  console.log('!downloadAsset___resourceName', resourceName);
  return axios({
    method: 'get',
    url: link,
    responseType: link.search(imageExtentsions) > 0 ? 'arraybuffer' : 'text',
  }).then(({ data }) => {
    const resourcePath = getPath(directoryPath, resourceName);
    console.log('resourcePath', resourcePath);
    return fsp.writeFile(resourcePath, data);
  });
};

const downloadPage = (address, downloadDirectory) => {
  const rootName = createName(address);
  const htmlExtension = '.html';
  const htmlName = modifyName(rootName, htmlExtension);
  const htmlPath = getPath(downloadDirectory, htmlName);
  const assetsDirectoryNamePostfix = '_files';
  const assetsDirectoryName = modifyName(rootName, assetsDirectoryNamePostfix);
  const assetsDirectoryPath = getPath(downloadDirectory, assetsDirectoryName);
  let html;
  let links;
  let modifiedHtml;
  return axios.get(address)
    .then(({ data }) => {
      html = data;
      links = getLinks(data, address);
    })
    .then(() => {
      modifiedHtml = modifyHtml(html, assetsDirectoryName, address);
    })
    .then(() => fsp.writeFile(htmlPath, modifiedHtml))
    .then(() => fsp.mkdir(assetsDirectoryPath))
    .then(() => {
      const tasks = links.map((link) => ({
        title: link,
        task: () => {
          const assetName = createAssetName(address, link);
          return downloadAsset(link, assetsDirectoryPath, assetName);
        },
      }));
      const listr = new Listr(tasks, { concurrent: true });
      return listr.run();
    })
    .then(() => htmlName);
};

export default downloadPage;
