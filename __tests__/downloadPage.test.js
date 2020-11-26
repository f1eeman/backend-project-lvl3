import os from 'os';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http.js';
import nock from 'nock';
import { promises as fsp } from 'fs';
import downloadPage from '../src/index.js';

nock.disableNetConnect();
axios.defaults.adapter = httpAdapter;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const getFilePath = (fileName) => path.join(__dirname, '..', '__fixtures__', fileName);

const baseUrl = 'https://ru.hexlet.io';
const requestUrl = 'https://ru.hexlet.io/courses';
const scope = nock(baseUrl).persist();

const resources = [
  {
    name: 'page',
    format: 'html',
    urlPath: '/courses',
    fileName: 'ru-hexlet-io-courses.html',
  },
  {
    name: 'img',
    format: 'svg',
    urlPath: /svg/,
    fileName: 'ru-hexlet-io-assets-professions-nodejs.svg',
  },
  {
    name: 'script',
    format: 'js',
    urlPath: /js/,
    fileName: 'ru-hexlet-io-packs-js-runtime.js',
  },
  {
    name: 'style',
    format: 'css',
    urlPath: /css/,
    fileName: 'ru-hexlet-io-assets-application.css',
  },
];

let content;
let tempDir;
let expected;

beforeAll(async () => {
  tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  expected = await fsp.readFile(getFilePath('expected.html'), 'utf8');

  const promises = resources.map(async (resource) => {
    const data = await fsp.readFile(getFilePath(`${resource.name}.${resource.format}`), 'utf8');
    const { format } = resource;
    return { format, data };
  });

  content = await Promise.all(promises);

  resources.forEach((resource) => {
    const currentContent = content.find(({ format }) => format === resource.format);
    scope.get(resource.urlPath).reply(200, currentContent.data);
  });
});

describe('Negative tests', () => {
  const fakeUrl = 'https://ru.hexlet.io/courses/cvxa';

  test('the fetch fails with an error', async () => {
    nock(baseUrl)
      .get('/courses/cvxa')
      .reply(404);
    const files = await fsp.readdir(tempDir);
    await expect(downloadPage(fakeUrl, tempDir)).rejects.toThrow(/404/);
    expect(files).toHaveLength(0);
  });

  test('specifying a nonexistent directory as the page download directory', async () => {
    await expect(downloadPage(requestUrl, '/tmp/dir')).rejects.toThrow('ENOENT');
  });
});

describe('Positive tests', () => {
  test('fetchData', async () => {
    await downloadPage(requestUrl, tempDir);
    const [htmlFile] = await fsp.readdir(tempDir);
    const htmlData = await fsp.readFile(path.join(tempDir, htmlFile), 'utf8');
    expect(htmlData).toEqual(expected);
  });

  test.each(resources)('resource %s', async (resource) => {
    const [, assetsDirectory] = await fsp.readdir(tempDir);
    const assetsDirectoryPath = `${tempDir}/${assetsDirectory}`;
    const data = await fsp.readFile(path.join(assetsDirectoryPath, resource.fileName), 'utf8');
    const currentContent = content.find(({ format }) => format === resource.format);
    expect(data).toEqual(currentContent.data);
  });
});
