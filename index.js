'use strict'

const child = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

exports.rfc1869 = require('./lib/rfc1869')
exports.FsyncWriteStream = require('./lib/fsync_writestream')
exports.TimerQueue = require('./lib/timer_queue')

exports.uuid = () => crypto.randomUUID().toUpperCase()

exports.in_array = function (item, array) {
  if (!array) return false
  if (!Array.isArray(array)) return false
  return array.includes(item)
}

exports.to_object = function (array) {
  if (typeof array === 'string') {
    array = array.split(/[\s,;]+/)
  }
  if (!Array.isArray(array)) {
    throw 'arguments to to_object must be a string or array'
  }
  const rv = {}
  for (let i = 0; i < array.length; i++) {
    if (array[i] === undefined) {
      continue
    }
    rv[array[i]] = true
  }
  return rv
}

exports.sort_keys = function (obj) {
  return Object.keys(obj).sort()
}

exports.uniq = function (arr) {
  const out = []
  for (const i of arr) {
    if (out.includes(i)) continue
    out.push(i)
  }
  return out
}

exports.extend = function (target, ...sources) {
  for (const source of sources) {
    if (!source) continue
    for (const [key, val] of Object.entries(source)) {
      if (UNSAFE_KEYS.has(key)) continue
      target[key] = val
    }
  }
  return target
}

exports.ISODate = function (d) {
  function pad(n) {
    return n < 10 ? `0${n}` : n
  }
  return `${d.getUTCFullYear()}-\
${pad(d.getUTCMonth() + 1)}-\
${pad(d.getUTCDate())}T\
${pad(d.getUTCHours())}:\
${pad(d.getUTCMinutes())}:\
${pad(d.getUTCSeconds())}Z`
}

const _daynames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
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
]

function _pad(num, n, p) {
  return num.toString().padStart(n, p || '0')
}

exports.pad = _pad

exports.date_to_str = function (d) {
  // https://www.rfc-editor.org/rfc/rfc2822#section-3.3
  return `${_daynames[d.getDay()]}, ${_pad(d.getDate(), 2)} \
${_monnames[d.getMonth()]} ${d.getFullYear()} \
${_pad(d.getHours(), 2)}:${_pad(d.getMinutes(), 2)}:\
${_pad(d.getSeconds(), 2)} \
${d.toString().match(/\sGMT([+-]\d+)/)[1]}`
}

exports.node_min = function (min, cur) {
  const wants = min.split('.')
  const has = (cur || process.version.substring(1)).split('.')

  for (let i = 0; i <= 3; i++) {
    // note use of unary + for fast type conversion to num
    if (+has[i] > +wants[i]) return true
    if (+has[i] < +wants[i]) return false
  }

  // they're identical
  return true
}

exports.existsSync = fs.existsSync

exports.indexOfLF = function (buf, maxlength) {
  for (let i = 0; i < buf.length; i++) {
    if (maxlength && i === maxlength) break
    if (buf[i] === 0x0a) return i
  }
  return -1
}

exports.prettySize = function (size) {
  if (size === 0 || !size) return 0
  const i = Math.floor(Math.log(size) / Math.log(1024))
  // https://wikipedia.org/wiki/Binary_prefix units with 1024 base
  // should use binary prefix
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  return `${(size / Math.pow(1024, i)).toFixed(2) * 1}${units[i]}`
}

exports.valid_regexes = function (list, file) {
  // list: an array of regexes. file: the file name containing the regex list
  const valid = []
  for (let i = 0; i < list.length; i++) {
    try {
      new RegExp(list[i])
    } catch (e) {
      console.error(`invalid regex in ${file}, ${list[i]}`)
      continue
    }
    valid.push(list[i])
  }
  return valid // returns a list of valid regexes
}

exports.regexp_escape = function (text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}

// Neutralize C0 controls and DEL so attacker-controlled input can't inject
// CRLF, NUL, or escape sequences into SMTP replies, syslog records (RFC 5424),
// or log lines. `replacement` defaults to removal; pass ' ' or '?' to keep the
// surrounding text legible.
exports.sanitize = function (str, { replacement = '' } = {}) {
  // eslint-disable-next-line no-control-regex
  return String(str ?? '').replace(/[\x00-\x1f\x7f]/g, replacement)
}

exports.base64 = function (str) {
  return Buffer.from(str, 'UTF-8').toString('base64')
}

exports.unbase64 = function (str) {
  return Buffer.from(str, 'base64').toString('UTF-8')
}

// SMTP AUTH CRAM-MD5 challenge-response. challenge is base64-encoded per RFC 2195.
exports.cram_md5_response = function (username, password, challenge) {
  const decoded = exports.unbase64(challenge)
  const digest = crypto
    .createHmac('md5', password)
    .update(decoded)
    .digest('hex')
  return exports.base64(`${username} ${digest}`)
}

// Fisher-Yates shuffle
// http://bost.ocks.org/mike/shuffle/
exports.shuffle = function (array) {
  let m = array.length
  let t
  let i

  // While there remain elements to shuffle…
  while (m) {
    // Pick a remaining element…
    i = Math.floor(Math.random() * m--)

    // And swap it with the current element.
    t = array[m]
    array[m] = array[i]
    array[i] = t
  }

  return array
}

exports.elapsed = function (start, decimal_places) {
  const diff = (Date.now() - start) / 1000 // in seconds

  if (decimal_places === undefined) {
    decimal_places = diff > 5 ? 0 : diff > 2 ? 1 : 2
  } else {
    decimal_places = parseInt(decimal_places)
    if (isNaN(decimal_places)) {
      decimal_places = 2
    }
  }
  return diff.toFixed(decimal_places)
}

exports.wildcard_to_regexp = function (str) {
  return `${str
    .replace(/[-[\]/{}()*+?.,\\^$|#\s]/g, '\\$&')
    .replaceAll('\\*', '.*')
    .replaceAll('\\?', '.')}$`
}

exports.line_regexp = /^([^\n]*\n)/

exports.copyDir = function (srcPath, dstPath) {
  exports.mkDir(dstPath)

  for (const file of fs.readdirSync(srcPath)) {
    // Ignore ".*"
    if (/^\./.test(file)) continue

    const srcFile = path.join(srcPath, file)
    const dstFile = path.join(dstPath, file)

    // lstatSync does NOT follow symlinks; copyDir refuses to traverse them
    // to prevent escaping the source root via attacker-controlled symlinks.
    const srcStat = fs.lstatSync(srcFile)

    if (srcStat.isSymbolicLink()) {
      warningMsg(`skipping symlink '${srcFile}'`)
      continue
    }
    if (srcStat.isDirectory()) {
      exports.copyDir(srcFile, dstFile)
    } else if (srcStat.isFile()) {
      exports.copyFile(srcFile, dstFile)
    }
  }
}

exports.copyFile = function (srcFile, dstFile) {
  if (fs.existsSync(dstFile)) {
    if (fs.lstatSync(dstFile).isFile()) {
      warningMsg(`EEXIST, File exists '${dstFile}'`)
      return
    }
    throw new Error(`EEXIST but not a file: '${dstFile}'`)
  }
  exports.mkDir(path.dirname(dstFile))
  fs.writeFileSync(dstFile, fs.readFileSync(srcFile))
  createMsg(dstFile)
}

exports.createFile = function (filePath, data, info = {}, force = false) {
  if (fs.existsSync(filePath) && !force) {
    throw new Error(`${filePath} already exists`)
  }
  exports.mkDir(path.dirname(filePath))
  const output = data.replace(/%(\w+)%/g, (_, m1) => info[m1])
  fs.writeFileSync(filePath, output)
}

function createMsg(dirPath) {
  console.log(`\x1b[32mcreate\x1b[0m: ${dirPath}`)
}

function warningMsg(msg) {
  console.error(`\x1b[31mwarning\x1b[0m: ${msg}`)
}

exports.mkDir = function (dstPath) {
  if (fs.existsSync(dstPath)) {
    if (fs.lstatSync(dstPath).isDirectory()) return
    throw new Error(`EEXIST but not a directory: '${dstPath}'`)
  }
  fs.mkdirSync(dstPath, { recursive: true })
  createMsg(dstPath)
}

exports.getGitCommitId = (dir) =>
  child
    .spawnSync('git', ['-C', dir, 'show', '--format=%h', '--no-patch'])
    .stdout.toString()
    .trim()

exports.getVersion = function (pkgDir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json')))
  let version = pkg.version

  if (fs.existsSync(path.join(pkgDir, '.git'))) {
    const commitId = exports.getGitCommitId(pkgDir)
    if (commitId) version += `/${commitId}`
  }

  return version
}
