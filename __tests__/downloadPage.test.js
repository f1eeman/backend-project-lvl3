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
const url = 'https://ru.hexlet.io/courses';
const promise = readFile(getFilePath('page.html'));
let tempDir;
let expected;

beforeEach(async () => {
  tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  await promise.then((data) => {
    expected = data;
  });
});

test('fetchData', async () => {
  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, expected);
  await downloadPage(url, tempDir);
  const [fileName] = await fsp.readdir(tempDir);
  const data = await fsp.readFile(path.join(tempDir, fileName), 'utf-8');
  expect(data).toEqual(expected);
});
