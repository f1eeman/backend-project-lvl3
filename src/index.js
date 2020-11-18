import axios from 'axios';
import url from 'url';
import fs, { promises as fsp } from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import prettier from 'prettier';
import debug from 'debug';
// import 'axios-debug-log';

const log = debug('pageloader');

const getPath = (catalog, fileName) => path.join(catalog, fileName);

const createName = (link) => {
  const { path: fullPath, host } = url.parse(link, true);
  const fileName = `${host}${fullPath}`
    .split(/[^A-Za-z0-9]/)
    .filter((el) => el !== '')
    .join('-');
  return fileName;
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

const downloadOtherResources = (html, rootAddress, directoryPath, resourcesDirectoryName) => {
  const changeAttributeValue = (cheerioFunc, tagElement, ref, attr) => {
    const lastIndexOfSlash = ref.lastIndexOf('/');
    const resourceName = ref.slice(lastIndexOfSlash + 1);
    const [formattedResourceName] = resourceName.match(/.+(css|js|ico|png)/);
    cheerioFunc(tagElement).attr(attr, getPath(resourcesDirectoryName, formattedResourceName));
    const formattedLink = createAbsolutelyPath(rootAddress, ref);
    axios({
      method: 'get',
      url: formattedLink,
      responseType: formattedResourceName.search(/(png|ico)/) > 0 ? 'arraybuffer' : 'text',
    })
      .then(({ data }) => {
        const resourcePath = getPath(directoryPath, formattedResourceName);
        return fsp.writeFile(resourcePath, data);
      });
  };
  const $ = cheerio.load(html, {
    normalizeWhitespace: true,
    decodeEntities: false,
  });
  $('link').each((i, tag) => {
    const attribute = 'href';
    const link = $(tag).attr(attribute);
    if (isRelativePath(link)) {
      changeAttributeValue($, tag, link, attribute);
    }
  });
  $('script').each((i, tag) => {
    const attribute = 'src';
    const link = $(tag).attr(attribute);

    if (link && link.slice(0, 2) !== '//' && isRelativePath(link)) {
      changeAttributeValue($, tag, link, attribute);
    }
    if (link && link.slice(0, 2) === '//') {
      $(tag).attr(attribute, url.format({ ...url.parse(link), protocol: 'https' }));
    }
  });
  const formattedHtml = prettier.format($.html(), { parser: 'html' });
  return formattedHtml;
};

const downloadImages = (html, directoryPath, resourcesDirectoryName) => {
  const $ = cheerio.load(html, {
    normalizeWhitespace: true,
    decodeEntities: false,
  });
  $('img').each((i, el) => {
    const link = $(el).attr('src');
    const lastIndexOfSlash = link.lastIndexOf('/');
    const imageName = link.slice(lastIndexOfSlash + 1);
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
    log('Operation has started');
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
    .then((editedHTML) => downloadOtherResources(
      editedHTML, address, pageResourcesDirectoryPath, pageResourcesDirectoryName,
    ))
    .then((newHtml) => fsp.writeFile(htmlPath, newHtml)))
  .then(() => log('Operation has finished'));

export default downloadPage;
