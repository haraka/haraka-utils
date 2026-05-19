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
})

describe('createFile', () => {
  it('creates a file', () => {
    const tmpFile = path.join('test', 'temp1', 'file')
    utils.createFile(tmpFile, 'contents')
    assert.ok(fs.existsSync(tmpFile))
  })
})

describe('copyFile', () => {
  it('copies a file', () => {
    const srcFile = path.join('test', 'temp1', 'file')
    const dstFile = path.join('test', 'temp1', 'file2')
    utils.copyFile(srcFile, dstFile)
    assert.ok(fs.existsSync(dstFile))
  })
})

describe('copyDir', () => {
  it('copies a directory', () => {
    const srcDir = path.join('test', 'temp1')
    const dstDir = path.join('test', 'temp2')
    utils.copyDir(srcDir, dstDir)
    assert.ok(fs.existsSync(dstDir))
  })
})

describe('getVersion', () => {
  it('gets a NPM package version', () => {
    const pkgVer = JSON.parse(fs.readFileSync(`./package.json`, 'utf8')).version
    const commitId = utils.getGitCommitId('.')
    assert.equal(`${pkgVer}/${commitId}`, utils.getVersion('.'))
  })
})
