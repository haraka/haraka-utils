'use strict';

const child = require('child_process');
const fs = require('fs');
const path = require('path');

// copied from http://www.broofa.com/Tools/Math.uuid.js
const CHARS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

exports.uuid = function () {
  const chars = CHARS;
  const uuid = new Array(36);
  let rnd = 0;
  let r;
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid[i] = '-';
    } else if (i === 14) {
      uuid[i] = '4';
    } else {
      if (rnd <= 0x02) rnd = (0x2000000 + Math.random() * 0x1000000) | 0;
      r = rnd & 0xf;
      rnd = rnd >> 4;
      uuid[i] = chars[i === 19 ? (r & 0x3) | 0x8 : r];
    }
  }
  return uuid.join('');
};

exports.in_array = function (item, array) {
  if (!array) return false;
  if (!Array.isArray(array)) return false;
  return array.includes(item);
};

exports.to_object = function (array) {
  if (typeof array === 'string') {
    array = array.split(/[\s,;]+/);
  }
  if (!Array.isArray(array)) {
    throw 'arguments to to_object must be a string or array';
  }
  const rv = {};
  for (let i = 0; i < array.length; i++) {
    if (array[i] === undefined) {
      continue;
    }
    rv[array[i]] = true;
  }
  return rv;
};

exports.sort_keys = function (obj) {
  return Object.keys(obj).sort();
};

exports.uniq = function (arr) {
  const out = [];
  for (const i of arr) {
    if (out.includes(i)) continue;
    out.push(i);
  }
  return out;
};

exports.extend = function (target) {
  // http://stackoverflow.com/questions/14974864/
  const sources = [].slice.call(arguments, 1);
  sources.forEach(function (source) {
    for (const prop in source) {
      target[prop] = source[prop];
    }
  });
  return target;
};

exports.ISODate = function (d) {
  function pad(n) {
    return n < 10 ? `0${n}` : n;
  }
  return `${d.getUTCFullYear()}-\
${pad(d.getUTCMonth() + 1)}-\
${pad(d.getUTCDate())}T\
${pad(d.getUTCHours())}:\
${pad(d.getUTCMinutes())}:\
${pad(d.getUTCSeconds())}Z`;
};

const _daynames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const _monnames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function _pad(num, n, p) {
  return num.toString().padStart(n, p || '0');
}

exports.pad = _pad;

exports.date_to_str = function (d) {
  // https://www.rfc-editor.org/rfc/rfc2822#section-3.3
  return `${_daynames[d.getDay()]}, ${_pad(d.getDate(), 2)} \
${_monnames[d.getMonth()]} ${d.getFullYear()} \
${_pad(d.getHours(), 2)}:${_pad(d.getMinutes(), 2)}:\
${_pad(d.getSeconds(), 2)} \
${d.toString().match(/\sGMT([+-]\d+)/)[1]}`;
};

exports.decode_qp = function (line) {
  console.warn(`SUNSET: 2025`);
  line = line.replace(/\r\n/g, '\n').replace(/[ \t]+\r?\n/g, '\n');
  if (!/=/.test(line)) return Buffer.from(line); // maybe a pointless optimisation

  line = line.replace(/=\n/gm, '');
  const buf = Buffer.alloc(line.length);
  let pos = 0;
  for (let i = 0, l = line.length; i < l; i++) {
    if (
      line[i] === '=' &&
      /=[0-9a-fA-F]{2}/.test(`${line[i]}${line[i + 1]}${line[i + 2]}`)
    ) {
      i++;
      buf[pos] = parseInt(`${line[i]}${line[i + 1]}`, 16);
      i++;
    } else {
      buf[pos] = line.charCodeAt(i);
    }
    pos++;
  }
  return buf.slice(0, pos);
};

function _char_to_qp(ch) {
  console.warn(`SUNSET: 2025`);
  return _buf_to_qp(Buffer.from(ch));
}

function _is_printable(charCode) {
  console.warn(`SUNSET: 2025`);
  switch (charCode) {
    case 61: // = (special in encoded words)
      return false;
    case 13: // CR
    case 10: // LF
      return true;
  }
  // much faster than a compound switch
  if (charCode > 32 && charCode <= 126) return true;
  return false;
}

function _buf_to_qp(b) {
  console.warn(`SUNSET: 2025`);
  let r = '';
  for (let i = 0; i < b.length; i++) {
    if (_is_printable(b[i])) {
      r = `${r}${String.fromCharCode(b[i])}`;
    } else {
      r = `${r}=${_pad(b[i].toString(16).toUpperCase(), 2)}`;
    }
  }
  return r;
}

// Shameless attempt to copy from Perl's MIME::QuotedPrint::Perl code.
const qpRe = /([^ \t\n!"#$%&'()*+,\-./0-9:;<>?@A-Z[\\\]^_`a-z{|}~])/g;
function asQuotedPrintable(str) {
  console.warn(`SUNSET: 2025`);
  if (Buffer.isBuffer(str)) return _buf_to_qp(str);

  return str
    .replace(qpRe, (orig, p1) => {
      return _char_to_qp(p1);
    })
    .replace(/([ \t]+)$/gm, (orig, p1) => {
      return p1.split('').map(_char_to_qp).join('');
    });
}

// NOTE: deprecated. Haraka now uses 'libqp' instead.
// See https://github.com/haraka/haraka-utils/issues/22
exports.encode_qp = (str) => {
  console.warn(`SUNSET: 2025`);
  // https://tools.ietf.org/html/rfc2045#section-6.7
  str = asQuotedPrintable(str);

  // Shorten lines to 76 chars, but don't break =XX encodes.
  // Method: iterate over to char 73.
  //   If char 74, 75 or 76 is = we need to break before the =.
  //   Otherwise break at 76.
  let cur_length = 0;
  let out = '';
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\n') {
      out = `${out}\n`;
      cur_length = 0;
      continue;
    }

    cur_length++;
    if (cur_length <= 73) {
      out = `${out}${str[i]}`;
    } else if (cur_length > 73 && cur_length < 76) {
      if (str[i] === '=') {
        out = `${out}=\n=`;
        cur_length = 1;
      } else {
        out = `${out}${str[i]}`;
      }
    } else {
      // Otherwise got to char 76

      // Don't insert '=\n' if end of string or next char is already \n:
      if (i === str.length - 1 || str[i + 1] === '\n') {
        out = `${out}${str[i]}`;
      } else {
        out = `${out}=\n${str[i]}`;
        cur_length = 1;
      }
    }
  }

  return out;
};

exports.node_min = function (min, cur) {
  const wants = min.split('.');
  const has = (cur || process.version.substring(1)).split('.');

  for (let i = 0; i <= 3; i++) {
    // note use of unary + for fast type conversion to num
    if (+has[i] > +wants[i]) return true;
    if (+has[i] < +wants[i]) return false;
  }

  // they're identical
  return true;
};

exports.existsSync = require(
  exports.node_min('0.8') ? 'fs' : 'path',
).existsSync;

exports.indexOfLF = function (buf, maxlength) {
  for (let i = 0; i < buf.length; i++) {
    if (maxlength && i === maxlength) break;
    if (buf[i] === 0x0a) return i;
  }
  return -1;
};

exports.prettySize = function (size) {
  if (size === 0 || !size) return 0;
  const i = Math.floor(Math.log(size) / Math.log(1024));
  // https://wikipedia.org/wiki/Binary_prefix units with 1024 base
  // should use binary prefix
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  return `${(size / Math.pow(1024, i)).toFixed(2) * 1}${units[i]}`;
};

exports.valid_regexes = function (list, file) {
  // list: an array of regexes. file: the file name containing the regex list
  const valid = [];
  for (let i = 0; i < list.length; i++) {
    try {
      new RegExp(list[i]);
    } catch (e) {
      console.error(`invalid regex in ${file}, ${list[i]}`);
      continue;
    }
    valid.push(list[i]);
  }
  return valid; // returns a list of valid regexes
};

exports.regexp_escape = function (text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

exports.base64 = function (str) {
  return Buffer.from(str, 'UTF-8').toString('base64');
};

exports.unbase64 = function (str) {
  return Buffer.from(str, 'base64').toString('UTF-8');
};

// Fisher-Yates shuffle
// http://bost.ocks.org/mike/shuffle/
exports.shuffle = function (array) {
  let m = array.length;
  let t;
  let i;

  // While there remain elements to shuffle…
  while (m) {
    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
};

exports.elapsed = function (start, decimal_places) {
  const diff = (Date.now() - start) / 1000; // in seconds

  if (decimal_places === undefined) {
    decimal_places = diff > 5 ? 0 : diff > 2 ? 1 : 2;
  } else {
    decimal_places = parseInt(decimal_places);
    if (isNaN(decimal_places)) {
      decimal_places = 2;
    }
  }
  return diff.toFixed(decimal_places);
};

exports.wildcard_to_regexp = function (str) {
  return `${str
    .replace(/[-[\]/{}()*+?.,\\^$|#\s]/g, '\\$&')
    .replace('\\*', '.*')
    .replace('\\?', '.')}$`;
};

exports.line_regexp = /^([^\n]*\n)/;

exports.copyDir = function (srcPath, dstPath) {
  exports.mkDir(dstPath);

  for (const file of fs.readdirSync(srcPath)) {
    // Ignore ".*"
    if (/^\./.test(file)) continue;

    const srcFile = path.join(srcPath, file);
    const dstFile = path.join(dstPath, file);

    const srcStat = fs.statSync(srcFile);

    if (srcStat.isDirectory()) {
      // if directory
      exports.copyDir(srcFile, dstFile); // recurse
    } else if (srcStat.isFile()) {
      // if file
      exports.copyFile(srcFile, dstFile); // copy to dstPath (no overwrite)
    }
  }
};

exports.copyFile = function (srcFile, dstFile) {
  try {
    if (fs.statSync(dstFile).isFile()) {
      warningMsg(`EEXIST, File exists '${dstFile}'`);
      return;
    }
    throw `EEXIST but not a file: '${dstFile}'`;
  } catch (e) {
    // File NOT exists
    if (e.code == 'ENOENT') {
      exports.mkDir(path.dirname(dstFile));
      fs.writeFileSync(dstFile, fs.readFileSync(srcFile));
      createMsg(dstFile);
    } else {
      console.log(`copy ${srcFile} to ${dstFile}`);
      throw e;
    }
  }
};

exports.createFile = function (filePath, data, info = {}, force = false) {
  try {
    if (fs.existsSync(filePath) && !force) {
      throw `${filePath} already exists`;
    }
    exports.mkDir(path.dirname(filePath));
    const fd = fs.openSync(filePath, 'w');
    const output = data.replace(/%(\w+)%/g, function (i, m1) {
      return info[m1];
    });
    fs.writeSync(fd, output, null);
  } catch (e) {
    warningMsg(`Unable to create file: ${e}`);
  }
};

function createMsg(dirPath) {
  console.log(`\x1b[32mcreate\x1b[0m: ${dirPath}`);
}

function warningMsg(msg) {
  console.error(`\x1b[31mwarning\x1b[0m: ${msg}`);
}

exports.mkDir = function (dstPath) {
  try {
    if (fs.statSync(dstPath).isDirectory()) return;
  } catch (ignore) {}

  try {
    fs.mkdirSync(dstPath, { recursive: true });
    createMsg(dstPath);
  } catch (e) {
    // File exists
    console.error(e);
    if (e.errno == 17) {
      warningMsg(e.message);
    } else {
      throw e;
    }
  }
};

exports.getGitCommitId = (dir) => {
  return child
    .spawnSync('git', ['show', '--format="%h"', '--no-patch'])
    .stdout.toString()
    .replaceAll('"', '')
    .trim();
};

exports.getVersion = function (pkgDir) {
  if (this._version) return this._version; // cache

  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json')));
  this._version = pkg.version;

  try {
    // if within a git repo
    fs.statSync(path.join(pkgDir, '.git'));
    const commitId = this.getGitCommitId(pkgDir);
    if (commitId) this._version += `/${commitId}`;
  } catch (ignore) {}

  return this._version;
};
