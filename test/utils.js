const assert = require('node:assert/strict')
const { describe, it, before, after } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')

const utils = require('../index')

function cleanup() {
  try {
    fs.rmSync(path.join('test', 'temp1'), { recursive: true, force: true })
    fs.rmSync(path.join('test', 'temp2'), { recursive: true, force: true })
  } catch (e) {
    console.log(e.message)
  }
}

before(() => {
  cleanup()
})
after(() => {
  cleanup()
})

describe('uuid', () => {
  it('generates a UUID of 36 characters', () => {
    const uuid = utils.uuid()
    assert.equal(uuid.length, 36)
  })

  it('contains only UUID chars', () => {
    const uuid = utils.uuid()
    assert.ok(/[0-9A-Za-z-]/.test(uuid))
  })
})

describe('uniq', () => {
  it('reduces an ordered array to unique elements', () => {
    const uniq = utils.uniq([1, 1, 2, 2, 3])
    assert.deepEqual(uniq, [1, 2, 3])
  })

  it('reduces a non-ordered array to unique elements', () => {
    const uniq = utils.uniq([1, 2, 3, 2, 1])
    assert.deepEqual(uniq, [1, 2, 3])
  })
})

describe('valid_regexes', () => {
  it('two valid', () => {
    const re_list = ['.*.exam.ple', '.*.example.com']
    assert.deepEqual(re_list, utils.valid_regexes(re_list))
  })

  it('one valid, one invalid', () => {
    const re_list = ['*.exam.ple', '.*.example.com']
    assert.deepEqual(['.*.example.com'], utils.valid_regexes(re_list))
  })

  it('one valid, two invalid', () => {
    const re_list = ['[', '*.exam.ple', '.*.example.com']
    assert.deepEqual(['.*.example.com'], utils.valid_regexes(re_list))
  })
})

describe('base64', () => {
  it('base64', () => {
    assert.equal(utils.base64('matt the tester'), 'bWF0dCB0aGUgdGVzdGVy')
  })

  it('unbase64', () => {
    assert.equal(utils.unbase64('bWF0dCB0aGUgdGVzdGVy'), 'matt the tester')
  })
})

describe('cram_md5_response', () => {
  // RFC 2195 sample: challenge "<1896.697170952@postoffice.reston.mci.net>"
  // username "tim", password "tanstaaftanstaaf" -> expected hex digest
  // b913a602c7eda7a495b4e6e7334d3890. Base64 of "tim b913...3890" is the
  // expected response.
  it('produces RFC 2195 example response', () => {
    const challenge = utils.base64('<1896.697170952@postoffice.reston.mci.net>')
    const expected = utils.base64('tim b913a602c7eda7a495b4e6e7334d3890')
    assert.equal(
      utils.cram_md5_response('tim', 'tanstaaftanstaaf', challenge),
      expected,
    )
  })
})

describe('to_object', () => {
  it('string', () => {
    assert.deepEqual(utils.to_object('matt,test'), { matt: true, test: true })
  })

  it('array', () => {
    assert.deepEqual(utils.to_object(['matt', 'test']), {
      matt: true,
      test: true,
    })
  })

  it('throws when input is neither string nor array', () => {
    assert.throws(() => utils.to_object(42), /string or array/)
    assert.throws(() => utils.to_object({}), /string or array/)
    assert.throws(() => utils.to_object(null), /string or array/)
  })

  it('skips undefined elements in array input', () => {
    assert.deepEqual(utils.to_object(['a', undefined, 'b']), {
      a: true,
      b: true,
    })
  })

  it('splits on whitespace, comma, semicolon (mixed delimiters)', () => {
    assert.deepEqual(utils.to_object('a, b;c\td'), {
      a: true,
      b: true,
      c: true,
      d: true,
    })
  })
})

describe('sort_keys', () => {
  it('returns object keys sorted alphabetically', () => {
    assert.deepEqual(utils.sort_keys({ b: 1, a: 2, c: 3 }), ['a', 'b', 'c'])
  })

  it('returns [] for an empty object', () => {
    assert.deepEqual(utils.sort_keys({}), [])
  })

  it('sorts lexicographically (default String comparison)', () => {
    // Default Array.sort is lexicographic, so '10' < '2' < 'a'.
    assert.deepEqual(utils.sort_keys({ 10: 'x', 2: 'y', a: 'z' }), [
      '10',
      '2',
      'a',
    ])
  })
})

describe('ISODate', () => {
  it('formats epoch as 1970-01-01T00:00:00Z', () => {
    assert.equal(utils.ISODate(new Date(0)), '1970-01-01T00:00:00Z')
  })

  it('zero-pads single-digit fields', () => {
    // 2026-01-02T03:04:05Z UTC
    const d = new Date(Date.UTC(2026, 0, 2, 3, 4, 5))
    assert.equal(utils.ISODate(d), '2026-01-02T03:04:05Z')
  })

  it('round-trips with Date.toISOString minus milliseconds', () => {
    const d = new Date('2024-06-15T13:45:59.123Z')
    assert.equal(utils.ISODate(d), '2024-06-15T13:45:59Z')
  })
})

describe('regexp_escape', () => {
  it('escapes all regex metacharacters', () => {
    const meta = '-[]{}()*+?.,\\^$|#\t '
    const escaped = utils.regexp_escape(meta)
    // Every meta char now backslash-prefixed; a RegExp built from it must
    // match the literal input.
    assert.ok(new RegExp(`^${escaped}$`).test(meta))
  })

  it('leaves plain strings unchanged', () => {
    assert.equal(utils.regexp_escape('hello world'), 'hello\\ world')
    assert.equal(utils.regexp_escape('abcXYZ123'), 'abcXYZ123')
  })

  it('escapes a regex special char so it matches literally', () => {
    const pattern = new RegExp(utils.regexp_escape('a.b'))
    assert.ok(pattern.test('a.b'))
    assert.ok(!pattern.test('axb'))
  })
})

describe('indexOfLF', () => {
  it('finds first LF in a buffer', () => {
    assert.equal(utils.indexOfLF(Buffer.from('foo\nbar')), 3)
  })

  it('returns -1 when no LF is present', () => {
    assert.equal(utils.indexOfLF(Buffer.from('no newline here')), -1)
  })

  it('returns -1 when maxlength is reached before any LF', () => {
    assert.equal(utils.indexOfLF(Buffer.from('foo\nbar'), 3), -1)
  })

  it('returns -1 for empty buffer', () => {
    assert.equal(utils.indexOfLF(Buffer.from('')), -1)
  })
})

describe('elapsed (additional)', () => {
  it('treats non-numeric decimal_places as 2', () => {
    const start = Date.now() - 1500
    assert.equal(utils.elapsed(start, 'banana'), '1.50')
  })

  it('parses numeric strings for decimal_places', () => {
    const start = Date.now() - 1517
    assert.equal(utils.elapsed(start, '1'), '1.5')
  })
})

describe('extend', () => {
  it('copies properties from one object', () => {
    const both = utils.extend({ first: 'boo' }, { second: 'ger' })
    assert.deepEqual({ first: 'boo', second: 'ger' }, both)
  })

  it('copies properties from multiple objects', () => {
    assert.deepEqual(
      utils.extend({ first: 'boo' }, { second: 'ger' }, { third: 'eat' }),
      { first: 'boo', second: 'ger', third: 'eat' },
    )
  })

  it('rejects __proto__ to prevent prototype pollution', () => {
    const payload = JSON.parse('{"__proto__":{"polluted":true}}')
    const result = utils.extend({}, payload)
    assert.equal(Object.getPrototypeOf(result), Object.prototype)
    assert.equal({}.polluted, undefined)
    assert.equal(result.polluted, undefined)
  })

  it('rejects constructor key', () => {
    const result = utils.extend({}, { constructor: 'evil' })
    assert.notEqual(result.constructor, 'evil')
  })

  it('rejects prototype key', () => {
    const result = utils.extend({}, { prototype: 'evil' })
    assert.equal(result.prototype, undefined)
  })

  it('does not pick up inherited enumerable properties', () => {
    const parent = { inherited: 'value' }
    const child = Object.create(parent)
    child.own = 'kept'
    const result = utils.extend({}, child)
    assert.equal(result.own, 'kept')
    assert.equal(result.inherited, undefined)
  })

  it('skips null / undefined sources', () => {
    const result = utils.extend({ a: 1 }, null, undefined, { b: 2 })
    assert.deepEqual(result, { a: 1, b: 2 })
  })
})

describe('wildcard_to_regexp', () => {
  it('replaces multiple stars', () => {
    assert.equal(utils.wildcard_to_regexp('*.example.*'), '.*\\.example\\..*$')
  })

  it('replaces multiple question marks', () => {
    assert.equal(utils.wildcard_to_regexp('a?b?c'), 'a.b.c$')
  })

  it('mixes stars and question marks', () => {
    const r = utils.wildcard_to_regexp('*.?.*')
    assert.equal(r, '.*\\..\\..*$')
    assert.ok(new RegExp(r).test('foo.x.bar'))
  })
})

describe('node_min', () => {
  it('node is new enough', () => {
    assert.ok(utils.node_min('0.8.0', '0.10.0'))
    assert.ok(utils.node_min('0.10.0', '0.10.0'))
    assert.ok(utils.node_min('0.10.0', '0.10.1'))
    assert.ok(utils.node_min('0.10.0', '0.12.0'))
    assert.ok(utils.node_min('0.10.0', '1.0.0'))
    assert.ok(utils.node_min('0.10', '1.0'))
    assert.ok(utils.node_min('18.0.0', '18.0.1'))
  })

  it('node is too old', () => {
    assert.ok(!utils.node_min('0.12.0', '0.10.0'))
    assert.ok(!utils.node_min('1.0.0', '0.8.0'))
    assert.ok(!utils.node_min('1.0.0', '0.10.0'))
    assert.ok(!utils.node_min('1.0.0', '0.12.0'))
    assert.ok(!utils.node_min('20.0.1', '18.0.1'))
  })

  it('falls back to process.version when cur is omitted', () => {
    // Project targets Node 20+, so any tiny minimum must compare true.
    assert.ok(utils.node_min('0.0.1'))
    // And a ridiculous future version must compare false.
    assert.ok(!utils.node_min('999.0.0'))
  })
})

describe('elapsed', () => {
  it('returns 0 decimal places', () => {
    const start = new Date()
    start.setTime(start.getTime() - 3517) // 3.517 seconds ago
    assert.strictEqual(utils.elapsed(start, 0), '4')
  })

  it('returns 1 decimal place', () => {
    const start = new Date()
    start.setTime(start.getTime() - 3517) // 3.517 seconds ago
    assert.strictEqual(utils.elapsed(start, 1), '3.5')
  })

  it('returns 2 decimal places', () => {
    const start = new Date()
    start.setTime(start.getTime() - 3517) // 3.517 seconds ago
    assert.strictEqual(utils.elapsed(start, 2), '3.52')
  })

  it('default N > 5 has 0 decimal places', () => {
    const start = new Date()
    start.setTime(start.getTime() - 13517) // 3.517 seconds ago
    assert.strictEqual(utils.elapsed(start), '14')
  })

  it('default N > 2 has 1 decimal places', () => {
    const start = new Date()
    start.setTime(start.getTime() - 3517) // 3.517 seconds ago
    assert.strictEqual(utils.elapsed(start), '3.5')
  })

  it('default has 2 decimal places', () => {
    const start = new Date()
    start.setTime(start.getTime() - 1517) // 3.517 seconds ago
    assert.strictEqual(utils.elapsed(start), '1.52')
  })
})

describe('prettySize', () => {
  // https://wikipedia.org/wiki/Binary_prefix units with 1024 base
  // should use binary prefix
  it('formats into 1024 sized KiB', () => {
    assert.equal(utils.prettySize(10000), '9.77KiB')
  })

  it('formats into 1024 sized MiB', () => {
    assert.equal(utils.prettySize(10000000), '9.54MiB')
  })

  it('formats into 1024 sized GiB', () => {
    assert.equal(utils.prettySize(10000000000), '9.31GiB')
  })

  it('formats into 1024 sized TiB', () => {
    assert.equal(utils.prettySize(10000000000000), '9.09TiB')
  })

  it('returns 0 for zero / undefined / null', () => {
    assert.equal(utils.prettySize(0), 0)
    assert.equal(utils.prettySize(undefined), 0)
    assert.equal(utils.prettySize(null), 0)
  })
})

describe('shuffle', () => {
  it('randomly returns an element from an array', () => {
    assert.deepEqual(utils.shuffle(['only']), ['only'])
    assert.equal(typeof utils.shuffle(['one', 'two']), 'object')
  })
})

describe('date_to_str', () => {
  it('returns a string representation of a date', () => {
    let testDate = new Date('2022-01-01T00:00:00.000Z')
    // adjust JS date by the test runners TZ offset
    testDate = new Date(
      testDate.getTime() + testDate.getTimezoneOffset() * 60 * 1000,
    )
    const r = utils.date_to_str(testDate).substring(0, 25) // strip TZ offset
    assert.equal(r, 'Sat, 01 Jan 2022 00:00:00')
  })
})

describe('in_array', () => {
  const testArr = [1, '2', 5]
  it('returns false when item missing', () => {
    assert.equal(utils.in_array(2, testArr), false)
  })

  it('returns true when item is present', () => {
    assert.equal(utils.in_array('2', testArr), true)
  })

  it('returns false when array argument is missing/falsy', () => {
    assert.equal(utils.in_array(1, undefined), false)
    assert.equal(utils.in_array(1, null), false)
    assert.equal(utils.in_array(1, 0), false)
  })

  it('returns false when array argument is not an array', () => {
    assert.equal(utils.in_array('foo', 'foo,bar'), false)
    assert.equal(utils.in_array(1, { 0: 1, length: 1 }), false)
  })
})

describe('indexOfLF', () => {
  it('find a LF at the right spot', () => {
    assert.equal(utils.indexOfLF(Buffer.from(`in t\nfourth`)), 4)
  })

  it('find a LF at the right spot', () => {
    assert.equal(utils.indexOfLF(Buffer.from(`in the\neighth`)), 6)
  })
})

describe('mkDir', () => {
  it('creates a directory', () => {
    const tmpPath = path.join('test', 'temp1')
    utils.mkDir(tmpPath)
    assert.ok(fs.existsSync(tmpPath))
  })

  it('is a no-op when directory already exists', () => {
    const tmpPath = path.join('test', 'temp1')
    utils.mkDir(tmpPath) // initial create
    assert.doesNotThrow(() => utils.mkDir(tmpPath))
    assert.ok(fs.existsSync(tmpPath))
  })

  it('throws when path exists as a file (not a directory)', () => {
    const filePath = path.join('test', 'temp1', 'a-file')
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, 'x')
    assert.throws(() => utils.mkDir(filePath), /EEXIST but not a directory/)
  })
})

describe('createFile', () => {
  it('creates a file', () => {
    const tmpFile = path.join('test', 'temp1', 'file')
    utils.createFile(tmpFile, 'contents')
    assert.ok(fs.existsSync(tmpFile))
  })

  it('throws when file exists and force is false', () => {
    const tmpFile = path.join('test', 'temp1', 'protected')
    utils.createFile(tmpFile, 'first')
    assert.throws(() => utils.createFile(tmpFile, 'second'), /already exists/)
    assert.equal(fs.readFileSync(tmpFile, 'utf8'), 'first')
  })

  it('overwrites when force is true', () => {
    const tmpFile = path.join('test', 'temp1', 'overwriteme')
    utils.createFile(tmpFile, 'first')
    utils.createFile(tmpFile, 'second', {}, true)
    assert.equal(fs.readFileSync(tmpFile, 'utf8'), 'second')
  })

  it('substitutes %NAME% template variables from info object', () => {
    const tmpFile = path.join('test', 'temp1', 'templated')
    utils.createFile(tmpFile, 'hello %who%, you have %count% messages', {
      who: 'matt',
      count: 3,
    })
    assert.equal(
      fs.readFileSync(tmpFile, 'utf8'),
      'hello matt, you have 3 messages',
    )
  })
})

describe('copyFile', () => {
  it('copies a file', () => {
    const srcFile = path.join('test', 'temp1', 'file')
    const dstFile = path.join('test', 'temp1', 'file2')
    utils.copyFile(srcFile, dstFile)
    assert.ok(fs.existsSync(dstFile))
  })

  it('warns and skips when destination already exists as a file', () => {
    const srcFile = path.join('test', 'temp1', 'file')
    const dstFile = path.join('test', 'temp1', 'file3')
    fs.writeFileSync(dstFile, 'pre-existing')
    // Should NOT throw and should NOT overwrite.
    const origErr = console.error
    let warning = ''
    console.error = (msg) => {
      warning = msg
    }
    try {
      utils.copyFile(srcFile, dstFile)
    } finally {
      console.error = origErr
    }
    assert.match(warning, /EEXIST/)
    assert.equal(fs.readFileSync(dstFile, 'utf8'), 'pre-existing')
  })

  it('throws when destination exists but is not a regular file', () => {
    const srcFile = path.join('test', 'temp1', 'file')
    const dstDir = path.join('test', 'temp1', 'a-directory')
    fs.mkdirSync(dstDir, { recursive: true })
    assert.throws(
      () => utils.copyFile(srcFile, dstDir),
      /EEXIST but not a file/,
    )
  })
})

describe('copyDir', () => {
  it('copies a directory', () => {
    const srcDir = path.join('test', 'temp1')
    const dstDir = path.join('test', 'temp2')
    utils.copyDir(srcDir, dstDir)
    assert.ok(fs.existsSync(dstDir))
  })

  it('recurses into subdirectories', () => {
    const srcDir = path.join('test', 'temp1', 'recurse-src')
    const dstDir = path.join('test', 'temp1', 'recurse-dst')
    fs.mkdirSync(path.join(srcDir, 'inner', 'deeper'), { recursive: true })
    fs.writeFileSync(path.join(srcDir, 'top.txt'), 'top')
    fs.writeFileSync(path.join(srcDir, 'inner', 'mid.txt'), 'mid')
    fs.writeFileSync(path.join(srcDir, 'inner', 'deeper', 'leaf.txt'), 'leaf')
    utils.copyDir(srcDir, dstDir)
    assert.equal(fs.readFileSync(path.join(dstDir, 'top.txt'), 'utf8'), 'top')
    assert.equal(
      fs.readFileSync(path.join(dstDir, 'inner', 'mid.txt'), 'utf8'),
      'mid',
    )
    assert.equal(
      fs.readFileSync(path.join(dstDir, 'inner', 'deeper', 'leaf.txt'), 'utf8'),
      'leaf',
    )
  })

  it('skips dotfiles', () => {
    const srcDir = path.join('test', 'temp1', 'dotfile-src')
    const dstDir = path.join('test', 'temp1', 'dotfile-dst')
    fs.mkdirSync(srcDir, { recursive: true })
    fs.writeFileSync(path.join(srcDir, '.hidden'), 'secret')
    fs.writeFileSync(path.join(srcDir, 'visible'), 'shown')
    utils.copyDir(srcDir, dstDir)
    assert.equal(fs.existsSync(path.join(dstDir, '.hidden')), false)
    assert.equal(fs.existsSync(path.join(dstDir, 'visible')), true)
  })

  it('does not follow symlinks', () => {
    const srcDir = path.join('test', 'temp1')
    const dstDir = path.join('test', 'temp3')
    fs.rmSync(dstDir, { recursive: true, force: true })
    const linkInSrc = path.join(srcDir, 'symlink-to-pkg')
    fs.rmSync(linkInSrc, { force: true })
    fs.symlinkSync(path.resolve('package.json'), linkInSrc)
    try {
      utils.copyDir(srcDir, dstDir)
      assert.equal(
        fs.existsSync(path.join(dstDir, 'symlink-to-pkg')),
        false,
        'symlink target must not be copied through',
      )
    } finally {
      fs.rmSync(linkInSrc, { force: true })
      fs.rmSync(dstDir, { recursive: true, force: true })
    }
  })
})

describe('getVersion', () => {
  it('gets a NPM package version', () => {
    const pkgVer = JSON.parse(fs.readFileSync(`./package.json`, 'utf8')).version
    const commitId = utils.getGitCommitId('.')
    assert.equal(`${pkgVer}/${commitId}`, utils.getVersion('.'))
  })

  it('returns the correct version for different package dirs', () => {
    const otherDir = path.join('test', 'fakepkg')
    fs.mkdirSync(otherDir, { recursive: true })
    fs.writeFileSync(
      path.join(otherDir, 'package.json'),
      JSON.stringify({ version: '99.99.99' }),
    )
    try {
      const v1 = utils.getVersion('.')
      const v2 = utils.getVersion(otherDir)
      assert.notEqual(v1, v2)
      assert.equal(v2, '99.99.99')
    } finally {
      fs.rmSync(otherDir, { recursive: true, force: true })
    }
  })
})
