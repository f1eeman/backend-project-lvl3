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
const readFile = (filePath) => fsp.readFile(filePath, 'utf8');
const url = 'https://www.drive.ru';
const responseHtml = readFile(getFilePath('responce.html'));
const imageJpg = readFile(getFilePath('img.jpg'));
const resultHtml = readFile(getFilePath('result.html'));
let tempDir;
let responce;
let expected;
let img;

beforeEach(async () => {
  tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  await responseHtml.then((data) => {
    responce = data;
  });
  await imageJpg.then((data) => {
    img = Buffer.from(data);
  });
  await resultHtml.then((data) => {
    expected = data;
  });
});

test('fetchData', async () => {
  nock('https://www.drive.ru')
    .get('/')
    .reply(200, responce);
  nock('https://img.drive.ru')
    .get('/i/3/1')
    .reply(200, img)
    .get('/i/3/2')
    .reply(200, img)
    .get('/i/3/3.jpeg')
    .reply(200, img)
    .get('/i/3/4.jpg')
    .reply(200, img)
    .get('/i/3/5.png')
    .reply(200, img)
    .get('/i/3/6.gif')
    .reply(200, img)
    .get('/i/3/7.svg')
    .reply(200, img)
    .get('/i/3/8.webp')
    .reply(200, img);
  await downloadPage(url, tempDir);
  const [fileName] = await fsp.readdir(tempDir);
  const data = await fsp.readFile(path.join(tempDir, fileName), 'utf-8');
  const files = await fsp.readdir(tempDir);
  const [, imagesDirectory] = files;
  const imagesDirectoryPath = `${tempDir}/${imagesDirectory}`;
  const images = await fsp.readdir(imagesDirectoryPath);
  expect(images).toHaveLength(8);
  expect(files).toHaveLength(2);
  expect(data).toEqual(expected);
});
