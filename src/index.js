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

const createAssetName = (rootName, link) => {
  const indexOfLastSlash = link.lastIndexOf('/');
  const partOflinkAfterLastSlash = link.slice(indexOfLastSlash + 1);
  const regexp = /.+(jpg|jpeg|svg|webp|png|gif|ico|css|js)/;
  const [resourceName] = partOflinkAfterLastSlash.match(regexp) || [partOflinkAfterLastSlash.concat('.jpg')];
  return `${rootName}-assets-${resourceName}`;
};

const modifyName = (name, value) => name.concat(value);

const isRelativePath = (link) => {
  const { protocol } = url.parse(link, true);
  return protocol === null;
};

const createAbsolutelyPath = (root, link) => {
  const linkData = url.parse(link, true);
  const rootData = url.parse(root, true);
  return url.format({ ...rootData, path: linkData.path, pathname: linkData.pathname });
};

const modifyHtml = (html, resourcesDirectoryName, rootName) => {
  const $ = cheerio.load(html, {
    normalizeWhitespace: true,
    decodeEntities: false,
  });
  const changeAttributeValue = (tagElement, ref, property) => {
    const resourceName = createAssetName(rootName, ref);
    $(tagElement).attr(property, getPath(resourcesDirectoryName, resourceName));
  };
  $('link').each((i, tag) => {
    const attribute = 'href';
    const link = $(tag).attr(attribute);
    if (isRelativePath(link)) {
      changeAttributeValue(tag, link, attribute);
    }
  });
  $('script').each((i, tag) => {
    const attribute = 'src';
    const link = $(tag).attr(attribute);
    if (link && link.slice(0, 2) !== '//' && isRelativePath(link)) {
      changeAttributeValue(tag, link, attribute);
    }
    if (link && link.slice(0, 2) === '//') {
      $(tag).attr(attribute, url.format({ ...url.parse(link), protocol: 'https' }));
    }
  });
  $('img').each((i, tag) => {
    const attribute = 'src';
    const link = $(tag).attr(attribute);
    changeAttributeValue(tag, link, attribute);
  });
  const formatOptions = { parser: 'html', printWidth: 150, embeddedLanguageFormatting: 'off' };
  const formattedHtml = prettier.format($.html(), formatOptions);
  return formattedHtml;
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
    .map((link) => {
      const newLink = link.search(imageExtentsions) > 0 ? link : link.concat('.jpg');
      const { protocol } = url.parse(newLink);
      return protocol !== null ? newLink : createAbsolutelyPath(address, link);
    });
  const scriptsLinks = scriptsElements
    .map(({ attribs }) => attribs.src)
    .filter((link) => link)
    .filter((link) => link.slice(0, 2) !== '//')
    .filter((link) => {
      const { protocol } = url.parse(link);
      return protocol === null;
    })
    .map((link) => createAbsolutelyPath(address, link));
  const otherLinks = linksElements
    .map(({ attribs }) => attribs.href)
    .filter((link) => {
      const { protocol } = url.parse(link);
      return protocol === null;
    })
    .map((link) => createAbsolutelyPath(address, link));
  const sharedLinks = [...imagesLinks, ...scriptsLinks, ...otherLinks];
  return sharedLinks;
};

const downloadAsset = (link, directoryPath, resourceName) => axios({
  method: 'get',
  url: link,
  responseType: link.search(imageExtentsions) > 0 ? 'arraybuffer' : 'text',
}).then(({ data }) => {
  const resourcePath = getPath(directoryPath, resourceName);
  return fsp.writeFile(resourcePath, data);
});

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
      modifiedHtml = modifyHtml(html, assetsDirectoryName, rootName);
    })
    .then(() => fsp.writeFile(htmlPath, modifiedHtml))
    .then(() => fsp.mkdir(assetsDirectoryPath))
    .then(() => {
      const tasks = links.map((link) => ({
        title: link,
        task: () => {
          const assetName = createAssetName(rootName, link);
          return downloadAsset(link, assetsDirectoryPath, assetName);
        },
      }));
      const listr = new Listr(tasks, { concurrent: true });
      return listr.run();
    })
    .then(() => htmlName);
};

export default downloadPage;
