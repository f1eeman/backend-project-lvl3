import os from 'os';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http.js';
import nock from 'nock';
import { promises as fsp } from 'fs';
import downloadPage from '../src/index.js';

axios.defaults.adapter = httpAdapter;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const getFilePath = (fileName) => path.join(__dirname, '..', '__fixtures__', fileName);

const baseUrl = 'https://ru.hexlet.io';
const requestUrl = 'https://ru.hexlet.io/courses';
const scope = nock(baseUrl).persist();

describe('Positive tests', () => {
  const resources = [
    {
      name: 'page',
      format: 'html',
      urlPath: '/courses',
      fileName: 'ru-hexlet-io-courses.html',
    },
    {
      name: 'img',
      format: 'png',
      urlPath: /png/,
      fileName: 'ru-hexlet-io-assets-professions-nodejs.png',
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
    nock.disableNetConnect();

    expected = await fsp.readFile(getFilePath('expected.html'), 'utf8');

    const promises = resources.map(async (resource) => {
      const encoding = resource.name === 'img' ? null : 'utf8';
      const data = await fsp.readFile(getFilePath(`${resource.name}.${resource.format}`), encoding);
      const { name } = resource;
      // console.log(name, data);
      return { name, data };
    });

    content = await Promise.all(promises);

    resources.forEach((resource) => {
      const currentContent = content.find(({ name }) => name === resource.name);
      scope.get(resource.urlPath).reply(200, currentContent.data);
    });

    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
    await downloadPage(requestUrl, tempDir);
  });

  test('fetchData', async () => {
    const [htmlFile] = await fsp.readdir(tempDir);
    const htmlData = await fsp.readFile(path.join(tempDir, htmlFile), 'utf-8');
    expect(htmlData).toEqual(expected);
  });

  test.each(resources)('resource %s', async (resource) => {
    const [, assetsDirectory] = await fsp.readdir(tempDir);
    const assetsDirectoryPath = `${tempDir}/${assetsDirectory}`;
    const encoding = resource.name === 'img' ? null : 'utf8';
    const data = await fsp.readFile(path.join(assetsDirectoryPath, resource.fileName), encoding);
    const currentContent = content.find(({ name }) => name === resource.name);
    // console.log('currentContent', currentContent);
    // console.log('resource', resource);
    expect(data).toEqual(currentContent.data);
  });
});

describe('Negative tests', () => {
  const fakeUrl = 'https://ru.hexlet.io/courses/cvxa';
  let tempDir;

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  });

  test('the fetch fails with an error', async () => {
    nock('https://ru.hexlet.io')
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
