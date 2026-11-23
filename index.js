'use strict'

const child = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { domainToASCII } = require('node:url')

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
    } catch {
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
// surrounding text legible. `keepTab` preserves HT (\x09), which RFC 5424
// permits in syslog message text.
exports.sanitize = function (str, { replacement = '', keepTab = false } = {}) {
  // eslint-disable-next-line no-control-regex
  const re = keepTab ? /[\x00-\x08\x0a-\x1f\x7f]/g : /[\x00-\x1f\x7f]/g
  return String(str ?? '').replace(re, replacement)
}

const MIME_TSPECIALS = new Set('()<>@,;:\\"/[]?=')
const ATEXT_SYMBOLS = new Set("!#$%&'*+-/=?^_`{|}~")

const is_ascii_alnum = (c) =>
  (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')

// RFC 2045 §5.1
function is_mime_token(str) {
  if (!str) return false
  for (const c of str) {
    const code = c.codePointAt(0)
    if (code <= 0x20 || code >= 0x7f || MIME_TSPECIALS.has(c)) return false
  }
  return true
}

const is_non_ascii = (c) => c.codePointAt(0) > 0x7f

// RFC 5322 §3.2.3, with RFC 6531 UTF-8 atext
const is_atext = (c) =>
  is_ascii_alnum(c) || ATEXT_SYMBOLS.has(c) || is_non_ascii(c)

const is_dot_atom = (str) =>
  str.split('.').every((atom) => atom !== '' && [...atom].every(is_atext))

// RFC 5322 §3.2.4
function is_quoted_string(str) {
  if (str.length < 2 || !str.startsWith('"') || !str.endsWith('"')) return false
  const last = str.length - 1
  for (let i = 1; i < last; i++) {
    if (str[i] === '"') return false
    if (str[i] === '\\' && ++i === last) return false
  }
  return true
}

// RFC 5321 §4.1.2 sub-domain
function is_sub_domain(label) {
  if (label === '' || label.length > 63) return false
  if (label.startsWith('-') || label.endsWith('-')) return false
  return [...label].every((c) => is_ascii_alnum(c) || c === '-')
}

// RFC 8601 §1.5.2 admits U-labels. domainToASCII (UTS #46) skips the hyphen
// checks and passes ASCII delimiters through into the A-label, so the result
// must still satisfy the LDH rules.
function is_domain_label(label) {
  if (![...label].some(is_non_ascii)) return is_sub_domain(label)
  if (label.startsWith('-') || label.endsWith('-')) return false
  return is_sub_domain(domainToASCII(label))
}

// RFC 6376 §3.5 requires at least two labels
function is_domain_name(str) {
  const labels = str.split('.')
  return labels.length > 1 && labels.every(is_domain_label)
}

const quote = (str) =>
  `"${str.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`

// RFC 8601 §2.2 pvalue: an email identity MUST be [local-part] "@"
// domain-name; anything else is a MIME token or a quoted-string. Quoting
// keeps ';' and whitespace in attacker-controlled input from starting a
// forged resinfo clause.
exports.auth_results_value = function (str) {
  const clean = exports.sanitize(str)
  if (is_mime_token(clean)) return clean

  const at = clean.lastIndexOf('@')
  const domain = clean.slice(at + 1)
  if (!is_domain_name(domain)) return quote(clean)
  if (at === -1) return clean

  const local = clean.slice(0, at)
  if (local === '' || is_dot_atom(local) || is_quoted_string(local))
    return clean
  return `${quote(local)}@${domain}`
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
    .stdout?.toString()
    ?.trim()

exports.getVersion = function (pkgDir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json')))
  let version = pkg.version

  if (fs.existsSync(path.join(pkgDir, '.git'))) {
    const commitId = exports.getGitCommitId(pkgDir)
    if (commitId) version += `/${commitId}`
  }

  return version
}
