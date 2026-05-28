'use strict'

const fs = require('node:fs')

// fs.WriteStream that fsyncs the file before the fd is closed, for durability.
// Hooks into _destroy so EVERY close path (explicit close(), end(), destroy(),
// autoClose) triggers fsync. Overriding close() alone would miss end()/destroy()
// because Writable's internal destroy lifecycle bypasses public close().
class FsyncWriteStream extends fs.WriteStream {
  _destroy(err, cb) {
    // Already-errored or never-opened destroys have nothing to fsync. Delegate
    // straight to super so callbacks aren't left hanging on an 'open' that
    // will never fire.
    if (err) return super._destroy(err, cb)
    const fsyncThen = () =>
      fs.fsync(this.fd, (fsyncErr) => super._destroy(fsyncErr, cb))
    if (typeof this.fd === 'number') return fsyncThen()

    // Stream wasn't open yet when destroy ran. Resolve on whichever of
    // 'open' / 'error' fires; only the first wins.
    let settled = false
    this.once('open', () => {
      if (settled) return
      settled = true
      fsyncThen()
    })
    this.once('error', (openErr) => {
      if (settled) return
      settled = true
      super._destroy(openErr, cb)
    })
  }

  // Convenience: dual-mode close. Routes through end() so any pending writes
  // flush first, then the _destroy override fsyncs, then the fd is closed.
  // Pass a callback or await the returned promise.
  close(cb) {
    if (this.destroyed) {
      if (cb) process.nextTick(cb)
      return cb ? undefined : Promise.resolve()
    }
    if (cb) {
      // Callback must observe fsync/close failures, not just success.
      // Whichever of 'close' or 'error' fires first settles the callback;
      // the second is ignored to preserve cb-fires-once semantics.
      let settled = false
      const done = (err) => {
        if (settled) return
        settled = true
        cb(err)
      }
      this.once('close', () => done())
      this.once('error', done)
      this.end()
      return
    }
    const promise = new Promise((resolve, reject) => {
      this.once('close', resolve)
      this.once('error', reject)
    })
    this.end()
    return promise
  }
}

module.exports = FsyncWriteStream
