const assert = require('assert')
const fs = require('fs')
const path = require('path')

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

describe('uuid', function () {
  it('generates a UUID of 36 characters', function (done) {
    const uuid = utils.uuid()
    assert.equal(uuid.length, 36)
    done()
  })

  it('contains only UUID chars', function (done) {
    const uuid = utils.uuid()
    assert.ok(/[0-9A-Za-z-]/.test(uuid))
    done()
  })
})

describe('uniq', function () {
  it('reduces an ordered array to unique elements', function (done) {
    const uniq = utils.uniq([1, 1, 2, 2, 3])
    assert.deepEqual(uniq, [1, 2, 3])
    done()
  })

  it('reduces a non-ordered array to unique elements', function (done) {
    const uniq = utils.uniq([1, 2, 3, 2, 1])
    assert.deepEqual(uniq, [1, 2, 3])
    done()
  })
})

describe.skip('encode_qp', function () {
  it('plain ascii should not be encoded', function () {
    assert.equal(utils.encode_qp('quoted printable'), 'quoted printable')
  })

  it('8-bit chars should be encoded', function () {
    assert.equal(
      utils.encode_qp('v\xe5re kj\xe6re norske tegn b\xf8r \xe6res'),
      'v=C3=A5re kj=C3=A6re norske tegn b=C3=B8r =C3=A6res',
    )
  })

  it('trailing space should be encoded', function () {
    assert.equal(utils.encode_qp('  '), '=20=20')
    assert.equal(utils.encode_qp('\tt\t'), '\tt=09')
    assert.equal(
      utils.encode_qp('test  \ntest\n\t \t \n'),
      'test=20=20\ntest\n=09=20=09=20\n',
    )
    assert.equal(utils.encode_qp('foo \t '), 'foo=20=09=20')
    assert.equal(utils.encode_qp('foo\t \n \t'), 'foo=09=20\n=20=09')
  })

  it('trailing space should be decoded unless newline', function () {
    assert.deepEqual(utils.decode_qp('foo  '), Buffer.from('foo  '))
    assert.deepEqual(utils.decode_qp('foo  \n'), Buffer.from('foo\n'))
  })

  it('"=" is special and should be decoded', function () {
    assert.equal(utils.encode_qp('=30\n'), '=3D30\n')
    assert.equal(utils.encode_qp('\0\xff0'), '=00=C3=BF0')
  })

  it('Very long lines should be broken', function () {
    assert.equal(
      utils.encode_qp(
        'The Quoted-Printable encoding is intended to represent data that largely consists of octets that correspond to printable characters in the ASCII character set.',
      ),
      'The Quoted-Printable encoding is intended to represent data that largely co=\nnsists of octets that correspond to printable characters in the ASCII chara=\ncter set.',
    )
  })

  it('multiple long lines', function () {
    assert.equal(
      utils.encode_qp(
        'College football is a game which would be much more interesting if the faculty played instead of the students, and even more interesting if the\ntrustees played.  There would be a great increase in broken arms, legs, and necks, and simultaneously an appreciable diminution in the loss to humanity. -- H. L. Mencken',
      ),
      'College football is a game which would be much more interesting if the facu=\nlty played instead of the students, and even more interesting if the\ntrustees played.  There would be a great increase in broken arms, legs, and=\n necks, and simultaneously an appreciable diminution in the loss to humanit=\ny. -- H. L. Mencken',
    )
  })

  it("Don't break a line that's near but not over 76 chars", function () {
    const buffer = `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\
xxxxxxxxxxxxxxxxxx`
    assert.equal(utils.encode_qp(`${buffer}123`), `${buffer}123`)
    assert.equal(utils.encode_qp(`${buffer}1234`), `${buffer}1234`)
    assert.equal(utils.encode_qp(`${buffer}12345`), `${buffer}12345`)
    assert.equal(utils.encode_qp(`${buffer}123456`), `${buffer}123456`)
    assert.equal(utils.encode_qp(`${buffer}1234567`), `${buffer}12345=\n67`)
    assert.equal(utils.encode_qp(`${buffer}123456=`), `${buffer}12345=\n6=3D`)
    assert.equal(utils.encode_qp(`${buffer}123\n`), `${buffer}123\n`)
    assert.equal(utils.encode_qp(`${buffer}1234\n`), `${buffer}1234\n`)
    assert.equal(utils.encode_qp(`${buffer}12345\n`), `${buffer}12345\n`)
    assert.equal(utils.encode_qp(`${buffer}123456\n`), `${buffer}123456\n`)
    assert.equal(utils.encode_qp(`${buffer}1234567\n`), `${buffer}12345=\n67\n`)
    assert.equal(
      utils.encode_qp(`${buffer}123456=\n`),
      `${buffer}12345=\n6=3D\n`,
    )
  })

  it('Not allowed to break =XX escapes using soft line break', function () {
    const buffer = `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\
xxxxxxxxxxxxxxxxxx`
    assert.equal(
      utils.encode_qp(`${buffer}===xxxxx`),
      `${buffer}=3D=\n=3D=3Dxxxxx`,
    )
    assert.equal(
      utils.encode_qp(`${buffer}1===xxxx`),
      `${buffer}1=3D=\n=3D=3Dxxxx`,
    )
    assert.equal(
      utils.encode_qp(`${buffer}12===xxx`),
      `${buffer}12=3D=\n=3D=3Dxxx`,
    )
    assert.equal(
      utils.encode_qp(`${buffer}123===xx`),
      `${buffer}123=\n=3D=3D=3Dxx`,
    )
    assert.equal(
      utils.encode_qp(`${buffer}1234===x`),
      `${buffer}1234=\n=3D=3D=3Dx`,
    )
    assert.equal(utils.encode_qp(`${buffer}12=\n`), `${buffer}12=3D\n`)
    assert.equal(utils.encode_qp(`${buffer}123=\n`), `${buffer}123=\n=3D\n`)
    assert.equal(utils.encode_qp(`${buffer}1234=\n`), `${buffer}1234=\n=3D\n`)
    assert.equal(utils.encode_qp(`${buffer}12345=\n`), `${buffer}12345=\n=3D\n`)
    assert.equal(
      utils.encode_qp(`${buffer}123456=\n`),
      `${buffer}12345=\n6=3D\n`,
    )
  })

  it('some extra special cases we have had problems with', function () {
    const buffer = `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\
xxxxxxxxxxxxxxxxxx`
    assert.equal(utils.encode_qp(`${buffer}12=x=x`), `${buffer}12=3D=\nx=3Dx`)
    assert.equal(
      utils.encode_qp(`${buffer}12345${buffer}12345${buffer}123456\n`),
      `${buffer}12345=\n${buffer}12345=\n${buffer}123456\n`,
    )
  })

  it('regression test 01', function () {
    assert.deepEqual(
      utils.decode_qp('foo  \n\nfoo =\n\nfoo=20\n\n'),
      Buffer.from('foo\n\nfoo \nfoo \n\n'),
    )
  })

  it('regression test 01 with CRLF', function () {
    assert.deepEqual(
      utils.decode_qp('foo  \r\n\r\nfoo =\r\n\r\nfoo=20\r\n\r\n'),
      Buffer.from('foo\n\nfoo \nfoo \n\n'),
    )
  })

  it('regression test 02', function () {
    assert.deepEqual(
      utils.decode_qp('foo = \t\x20\nbar\t\x20\n'),
      Buffer.from('foo bar\n'),
    )
  })

  it('regression test 02 with CRLF', function () {
    assert.deepEqual(
      utils.decode_qp('foo = \t\x20\r\nbar\t\x20\r\n'),
      Buffer.from('foo bar\n'),
    )
  })

  it('regression test 03', function () {
    assert.deepEqual(utils.decode_qp('foo = \t\x20\n'), Buffer.from('foo '))
  })

  it('regression test 03 with CRLF', function () {
    assert.deepEqual(utils.decode_qp('foo = \t\x20\r\n'), Buffer.from('foo '))
  })

  it('regression test 04 from CRLF to LF', function () {
    assert.deepEqual(
      utils.decode_qp('foo = \t\x20y\r\n'),
      Buffer.from('foo = \t\x20y\n'),
    )
  })

  it('regression test 05 should be the same', function () {
    assert.deepEqual(utils.decode_qp('foo =xy\n'), Buffer.from('foo =xy\n'))
  })

  it('spin encode_qp()', function () {
    const spin = 10000
    for (let i = 0; i < spin; i++) {
      assert.equal(utils.encode_qp('quoted printable'), 'quoted printable')
    }
  })

  it.skip('plain ascii should not be encoded in Buffers', function () {
    // See https://github.com/haraka/haraka-utils/issues/22
    assert.equal(
      utils.encode_qp(Buffer.from('quoted printable')),
      'quoted printable',
    )
  })

  it.skip('8-bit chars should be encoded in Buffers', function () {
    // See https://github.com/haraka/haraka-utils/issues/22
    assert.equal(
      utils.encode_qp(
        Buffer.from('v\xe5re kj\xe6re norske tegn b\xf8r \xe6res'),
      ),
      'v=C3=A5re kj=C3=A6re norske tegn b=C3=B8r =C3=A6res',
    )
  })
})

describe('valid_regexes', function () {
  it('two valid', function (done) {
    const re_list = ['.*.exam.ple', '.*.example.com']
    assert.deepEqual(re_list, utils.valid_regexes(re_list))
    done()
  })

  it('one valid, one invalid', function (done) {
    const re_list = ['*.exam.ple', '.*.example.com']
    assert.deepEqual(['.*.example.com'], utils.valid_regexes(re_list))
    done()
  })

  it('one valid, two invalid', function (done) {
    const re_list = ['[', '*.exam.ple', '.*.example.com']
    assert.deepEqual(['.*.example.com'], utils.valid_regexes(re_list))
    done()
  })
})

describe('base64', function () {
  it('base64', function (done) {
    assert.equal(utils.base64('matt the tester'), 'bWF0dCB0aGUgdGVzdGVy')
    done()
  })

  it('unbase64', function (done) {
    assert.equal(utils.unbase64('bWF0dCB0aGUgdGVzdGVy'), 'matt the tester')
    done()
  })
})

describe('to_object', function () {
  it('string', function (done) {
    assert.deepEqual(utils.to_object('matt,test'), { matt: true, test: true })
    done()
  })

  it('array', function (done) {
    assert.deepEqual(utils.to_object(['matt', 'test']), {
      matt: true,
      test: true,
    })
    done()
  })
})

describe('extend', function () {
  it('copies properties from one object', function (done) {
    const both = utils.extend({ first: 'boo' }, { second: 'ger' })
    assert.deepEqual({ first: 'boo', second: 'ger' }, both)
    done()
  })

  it('copies properties from multiple objects', function (done) {
    assert.deepEqual(
      utils.extend({ first: 'boo' }, { second: 'ger' }, { third: 'eat' }),
      { first: 'boo', second: 'ger', third: 'eat' },
    )
    done()
  })
})

describe('node_min', function () {
  it('node is new enough', function () {
    assert.ok(utils.node_min('0.8.0', '0.10.0'))
    assert.ok(utils.node_min('0.10.0', '0.10.0'))
    assert.ok(utils.node_min('0.10.0', '0.10.1'))
    assert.ok(utils.node_min('0.10.0', '0.12.0'))
    assert.ok(utils.node_min('0.10.0', '1.0.0'))
    assert.ok(utils.node_min('0.10', '1.0'))
    assert.ok(utils.node_min('18.0.0', '18.0.1'))
  })

  it('node is too old', function () {
    assert.ok(!utils.node_min('0.12.0', '0.10.0'))
    assert.ok(!utils.node_min('1.0.0', '0.8.0'))
    assert.ok(!utils.node_min('1.0.0', '0.10.0'))
    assert.ok(!utils.node_min('1.0.0', '0.12.0'))
    assert.ok(!utils.node_min('20.0.1', '18.0.1'))
  })
})

describe('elapsed', function () {
  it('returns 0 decimal places', function (done) {
    const start = new Date()
    start.setTime(start.getTime() - 3517) // 3.517 seconds ago
    assert.strictEqual(utils.elapsed(start, 0), '4')
    done()
  })

  it('returns 1 decimal place', function (done) {
    const start = new Date()
    start.setTime(start.getTime() - 3517) // 3.517 seconds ago
    assert.strictEqual(utils.elapsed(start, 1), '3.5')
    done()
  })

  it('returns 2 decimal places', function (done) {
    const start = new Date()
    start.setTime(start.getTime() - 3517) // 3.517 seconds ago
    assert.strictEqual(utils.elapsed(start, 2), '3.52')
    done()
  })

  it('default N > 5 has 0 decimal places', function (done) {
    const start = new Date()
    start.setTime(start.getTime() - 13517) // 3.517 seconds ago
    assert.strictEqual(utils.elapsed(start), '14')
    done()
  })

  it('default N > 2 has 1 decimal places', function (done) {
    const start = new Date()
    start.setTime(start.getTime() - 3517) // 3.517 seconds ago
    assert.strictEqual(utils.elapsed(start), '3.5')
    done()
  })

  it('default has 2 decimal places', function (done) {
    const start = new Date()
    start.setTime(start.getTime() - 1517) // 3.517 seconds ago
    assert.strictEqual(utils.elapsed(start), '1.52')
    done()
  })
})

describe('prettySize', function () {
  // https://wikipedia.org/wiki/Binary_prefix units with 1024 base
  // should use binary prefix
  it('formats into 1024 sized KiB', function (done) {
    assert.equal(utils.prettySize(10000), '9.77KiB')
    done()
  })

  it('formats into 1024 sized MiB', function (done) {
    assert.equal(utils.prettySize(10000000), '9.54MiB')
    done()
  })

  it('formats into 1024 sized GiB', function (done) {
    assert.equal(utils.prettySize(10000000000), '9.31GiB')
    done()
  })

  it('formats into 1024 sized TiB', function (done) {
    assert.equal(utils.prettySize(10000000000000), '9.09TiB')
    done()
  })
})

describe('shuffle', function () {
  it('randomly returns an element from an array', function (done) {
    assert.equal(utils.shuffle(['only']), 'only')
    assert.ok(typeof utils.shuffle(['one', 'two']), 'string')
    done()
  })
})

describe('date_to_str', function () {
  it('returns a string representation of a date', function () {
    let testDate = new Date('2022-01-01T00:00:00.000Z')
    // adjust JS date by the test runners TZ offset
    testDate = new Date(
      testDate.getTime() + testDate.getTimezoneOffset() * 60 * 1000,
    )
    const r = utils.date_to_str(testDate).substring(0, 25) // strip TZ offset
    assert.equal(r, 'Sat, 01 Jan 2022 00:00:00')
  })
})

describe('in_array', function () {
  const testArr = [1, '2', 5]
  it('returns false when item missing', function () {
    assert.equal(utils.in_array(2, testArr), false)
  })

  it('returns true when item is present', function () {
    assert.equal(utils.in_array('2', testArr), true)
  })
})

describe('indexOfLF', function () {
  it('find a LF at the right spot', function () {
    assert.equal(utils.indexOfLF(Buffer.from(`in t\nfourth`)), 4)
  })

  it('find a LF at the right spot', function () {
    assert.equal(utils.indexOfLF(Buffer.from(`in the\neighth`)), 6)
  })
})

describe('mkDir', function () {
  it('creates a directory', () => {
    const tmpPath = path.join('test', 'temp1')
    utils.mkDir(tmpPath)
    assert.ok(fs.existsSync(tmpPath))
  })
})

describe('createFile', function () {
  it('creates a file', () => {
    const tmpFile = path.join('test', 'temp1', 'file')
    utils.createFile(tmpFile, 'contents')
    assert.ok(fs.existsSync(tmpFile))
  })
})

describe('copyFile', function () {
  it('copies a file', () => {
    const srcFile = path.join('test', 'temp1', 'file')
    const dstFile = path.join('test', 'temp1', 'file2')
    utils.copyFile(srcFile, dstFile)
    assert.ok(fs.existsSync(dstFile))
  })
})

describe('copyDir', function () {
  it('copies a directory', () => {
    const srcDir = path.join('test', 'temp1')
    const dstDir = path.join('test', 'temp2')
    utils.copyDir(srcDir, dstDir)
    assert.ok(fs.existsSync(dstDir))
  })
})

describe('getVersion', function () {
  it('gets a NPM package version', () => {
    const pkgVer = JSON.parse(fs.readFileSync(`./package.json`, 'utf8')).version
    const commitId = utils.getGitCommitId('.')
    assert.equal(`${pkgVer}/${commitId}`, utils.getVersion('.'))
  })
})
