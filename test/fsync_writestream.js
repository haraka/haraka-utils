'use strict'

const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const FsyncWriteStream = require('../lib/fsync_writestream')

let tmpDir

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fsync-ws-'))
})

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('FsyncWriteStream', () => {
  it('fs.fsync fires on plain ws.end() / autoClose path (not just close())', async () => {
    const file = path.join(tmpDir, 'end-fsync.txt')
    const ws = new FsyncWriteStream(file)

    const origFsync = fs.fsync
    let fsyncCalls = 0
    fs.fsync = (fd, cb) => {
      fsyncCalls += 1
      return origFsync(fd, cb)
    }
    try {
      await new Promise((resolve, reject) => {
        ws.on('close', resolve)
        ws.on('error', reject)
        ws.write('payload')
        ws.end()
      })
    } finally {
      fs.fsync = origFsync
    }
    assert.equal(fsyncCalls, 1, 'fsync must fire on plain end() path')
    assert.equal(fs.readFileSync(file, 'utf8'), 'payload')
  })

  it('fs.fsync fires on destroy() path', async () => {
    const file = path.join(tmpDir, 'destroy-fsync.txt')
    const ws = new FsyncWriteStream(file)
    await new Promise((resolve, reject) => {
      ws.on('open', resolve)
      ws.on('error', reject)
    })
    await new Promise((resolve, reject) =>
      ws.write('x', (err) => (err ? reject(err) : resolve())),
    )

    const origFsync = fs.fsync
    let fsyncCalls = 0
    fs.fsync = (fd, cb) => {
      fsyncCalls += 1
      return origFsync(fd, cb)
    }
    try {
      await new Promise((resolve, reject) => {
        ws.on('close', resolve)
        ws.on('error', reject)
        ws.destroy()
      })
    } finally {
      fs.fsync = origFsync
    }
    assert.equal(fsyncCalls, 1, 'fsync must fire on destroy() path')
  })

  it('writes bytes and persists them on close', async () => {
    const file = path.join(tmpDir, 'one.txt')
    const ws = new FsyncWriteStream(file)
    await new Promise((resolve, reject) => {
      ws.write('hello\n')
      ws.write('world\n')
      ws.on('close', resolve)
      ws.on('error', reject)
      ws.end()
    })
    assert.equal(fs.readFileSync(file, 'utf8'), 'hello\nworld\n')
  })

  it('emits close exactly once after fsync', async () => {
    const file = path.join(tmpDir, 'two.txt')
    const ws = new FsyncWriteStream(file)
    let closes = 0
    await new Promise((resolve, reject) => {
      ws.on('close', () => {
        closes += 1
        // Give other listeners a chance to fire spuriously
        setImmediate(resolve)
      })
      ws.on('error', reject)
      ws.write('x')
      ws.end()
    })
    assert.equal(closes, 1)
  })

  it('fires close callback when invoked before open completes', async () => {
    const file = path.join(tmpDir, 'three.txt')
    const ws = new FsyncWriteStream(file)
    await new Promise((resolve, reject) => {
      // Schedule close immediately, before fs.open resolves the fd
      ws.close((err) => (err ? reject(err) : resolve()))
    })
    assert.ok(fs.existsSync(file))
  })

  it('concurrent close() calls all fire after the single in-flight fsync', async () => {
    const file = path.join(tmpDir, 'concurrent.txt')
    const ws = new FsyncWriteStream(file)
    ws.write('payload')

    let firstDone = false
    const order = []
    const both = Promise.all([
      new Promise((resolve, reject) => {
        ws.close((err) => {
          if (err) return reject(err)
          firstDone = true
          order.push('first')
          resolve()
        })
      }),
      new Promise((resolve, reject) => {
        // Second close() while the first is in-flight must not emit a synthetic
        // 'close' before the real fsync+close completes.
        ws.close((err) => {
          if (err) return reject(err)
          assert.equal(firstDone, true, 'second close fired before first')
          order.push('second')
          resolve()
        })
      }),
    ])
    await both
    assert.deepEqual(order, ['first', 'second'])
  })

  it('close() with no callback returns a promise that resolves on close', async () => {
    const file = path.join(tmpDir, 'promise-ok.txt')
    const ws = new FsyncWriteStream(file)
    ws.write('payload')
    const result = ws.close()
    assert.ok(result instanceof Promise, 'no-cb form must return a Promise')
    await result
    assert.equal(fs.readFileSync(file, 'utf8'), 'payload')
  })

  it('close() promise rejects when fsync fails', async () => {
    const file = path.join(tmpDir, 'promise-fail.txt')
    const ws = new FsyncWriteStream(file)
    await new Promise((resolve, reject) => {
      ws.on('open', resolve)
      ws.on('error', reject)
    })
    await new Promise((resolve, reject) =>
      ws.write('x', (err) => (err ? reject(err) : resolve())),
    )

    const origFsync = fs.fsync
    fs.fsync = (fd, cb) => cb(new Error('synthetic fsync failure'))
    try {
      await assert.rejects(ws.close(), /synthetic fsync failure/)
    } finally {
      fs.fsync = origFsync
    }
  })

  it('callback receives the error when fsync fails', async () => {
    const file = path.join(tmpDir, 'cb-err.txt')
    const ws = new FsyncWriteStream(file)
    await new Promise((resolve, reject) => {
      ws.on('open', resolve)
      ws.on('error', reject)
    })
    await new Promise((resolve, reject) =>
      ws.write('x', (err) => (err ? reject(err) : resolve())),
    )

    const origFsync = fs.fsync
    fs.fsync = (fd, cb) => cb(new Error('synthetic fsync failure'))
    try {
      const err = await new Promise((resolve) => ws.close(resolve))
      assert.ok(err, 'callback must receive an error, not undefined')
      assert.match(err.message, /synthetic fsync failure/)
    } finally {
      fs.fsync = origFsync
    }
  })

  it('close(cb) returns undefined (back-compat)', async () => {
    const file = path.join(tmpDir, 'cb-undef.txt')
    const ws = new FsyncWriteStream(file)
    ws.write('x')
    const result = await new Promise((resolve) => {
      const ret = ws.close(() => resolve(ret))
    })
    assert.equal(result, undefined)
  })

  it('_destroy delegates to super when called with an error (no fsync)', async () => {
    const file = path.join(tmpDir, 'destroy-err.txt')
    const ws = new FsyncWriteStream(file)
    await new Promise((resolve, reject) => {
      ws.on('open', resolve)
      ws.on('error', reject)
    })

    const origFsync = fs.fsync
    let fsyncCalls = 0
    fs.fsync = (fd, cb) => {
      fsyncCalls += 1
      return origFsync(fd, cb)
    }
    try {
      await new Promise((resolve) => {
        ws.on('error', () => resolve())
        ws.destroy(new Error('caller-supplied error'))
      })
    } finally {
      fs.fsync = origFsync
    }
    assert.equal(
      fsyncCalls,
      0,
      'fsync must not run when destroy is given an error',
    )
  })

  it('_destroy on a stream whose open fails resolves via the error path', async () => {
    const ws = new FsyncWriteStream(
      path.join(tmpDir, 'no-such-dir', 'cannot-open'),
    )
    // Don't wait for 'open' — call close before it can resolve. open() will
    // ENOENT, triggering the 'error' branch of the pre-open _destroy wait.
    const err = await new Promise((resolve) => ws.close(resolve))
    assert.ok(err instanceof Error, 'callback must receive the open error')
    assert.match(err.code || err.message, /ENOENT/)
  })

  it('close() on already-destroyed stream resolves immediately (promise)', async () => {
    const file = path.join(tmpDir, 'reclose.txt')
    const ws = new FsyncWriteStream(file)
    await ws.close()
    // Second close: stream is destroyed; should resolve right away.
    const p = ws.close()
    assert.ok(p instanceof Promise)
    await p
  })

  it('close(cb) on already-destroyed stream fires cb immediately', async () => {
    const file = path.join(tmpDir, 'reclose-cb.txt')
    const ws = new FsyncWriteStream(file)
    await ws.close()
    await new Promise((resolve) => ws.close(resolve))
  })

  it('closes the fd even when fsync fails', async () => {
    const file = path.join(tmpDir, 'fsync-fail.txt')
    const ws = new FsyncWriteStream(file)
    await new Promise((resolve, reject) => {
      ws.on('open', resolve)
      ws.on('error', reject)
    })
    await new Promise((resolve, reject) =>
      ws.write('x', (err) => (err ? reject(err) : resolve())),
    )

    const origFsync = fs.fsync
    const origClose = fs.close
    const closedFds = []
    fs.fsync = (fd, cb) => cb(new Error('synthetic fsync failure'))
    fs.close = (fd, cb) => {
      closedFds.push(fd)
      return origClose(fd, cb)
    }
    try {
      await assert.rejects(ws.close(), /synthetic fsync failure/)
      assert.equal(closedFds.length, 1, 'fd was closed despite fsync failure')
    } finally {
      fs.fsync = origFsync
      fs.close = origClose
    }
  })
})
