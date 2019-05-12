const path = require('path');

const mkdirp = require('mkdirp');

const ROOT_DIR = path.resolve(__dirname, '..');
const SOCKET_DIR = path.resolve(ROOT_DIR, 'tmp', 'test', 'sockets');

mkdirp.sync(SOCKET_DIR);
