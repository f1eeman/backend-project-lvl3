import os from 'os';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http.js';
import nock from 'nock';
import { promises as fsp } from 'fs';
import downloadPage from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

axios.defaults.adapter = httpAdapter;
nock.disableNetConnect();

const getFilePath = (fileName) => path.join(__dirname, '..', '__fixtures__', fileName);
const url = 'https://ru.hexlet.io/courses';
const fakeUrl2 = 'https://ru.hexlet.io/courses/cvxa';
const responseHtml = fsp.readFile(getFilePath('responce.html'), 'utf8');
const imageJpg = fsp.readFile(getFilePath('img.png'));
const resultHtml = fsp.readFile(getFilePath('result.html'), 'utf8');
const styleCss = fsp.readFile(getFilePath('style.css'), 'utf8');
const scriptJs = fsp.readFile(getFilePath('script.js'), 'utf8');
let tempDir;
let responce;
let expected;
let img;
let style;
let script;

beforeEach(async () => {
  tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  await responseHtml.then((data) => {
    responce = data;
  });
  await styleCss.then((data) => {
    style = data;
  });
  await scriptJs.then((data) => {
    script = data;
  });
  await imageJpg.then((data) => {
    img = data;
  });
  await resultHtml.then((data) => {
    expected = data;
  });
});

test('fetchData', async () => {
  nock('https://ru.hexlet.io')
    .persist()
    .get('/courses')
    .reply(200, responce)
    .get('/assets/professions/nodejs.png')
    .reply(200, img)
    .get('/packs/js/runtime.js')
    .reply(200, script)
    .get('/assets/application.css')
    .reply(200, style);
  await downloadPage(url, tempDir);
  const [htmlFile, assetsDirectory] = await fsp.readdir(tempDir);
  const htmlData = await fsp.readFile(path.join(tempDir, htmlFile), 'utf-8');
  const assetsDirectoryPath = `${tempDir}/${assetsDirectory}`;
  const [styleFile, imgFile, aboutFile, scriptFile] = await fsp.readdir(assetsDirectoryPath);
  const styleFileData = await fsp.readFile(path.join(assetsDirectoryPath, styleFile), 'utf-8');
  const imgFileData = await fsp.readFile(path.join(assetsDirectoryPath, imgFile));
  const aboutFileData = await fsp.readFile(path.join(assetsDirectoryPath, aboutFile), 'utf-8');
  const scriptFileData = await fsp.readFile(path.join(assetsDirectoryPath, scriptFile), 'utf-8');
  await expect(styleFileData).toBe(style);
  await expect(imgFileData).toEqual(img);
  await expect(aboutFileData).toBe(responce);
  await expect(scriptFileData).toBe(script);
  expect(htmlData).toEqual(expected);
});

test('the fetch fails with an error', async () => {
  nock('https://ru.hexlet.io')
    .get('/courses/cvxa')
    .reply(404);
  await expect(downloadPage(fakeUrl2, tempDir)).rejects.toThrow('Request failed with status code 404');
});

test('specifying a nonexistent directory as the page download directory', async () => {
  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, responce);
  await expect(downloadPage(url, 'tmp/dir')).rejects.toThrow();
});
