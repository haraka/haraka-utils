'use strict'

const fs = require('node:fs')

// fs.WriteStream that fsyncs the file before the fd is closed, for durability.
// Hooks into _destroy so EVERY close path (explicit close(), end(), destroy(),
// autoClose) triggers fsync. Overriding close() alone would miss end()/destroy()
// because Writable's internal destroy lifecycle bypasses public close().
class FsyncWriteStream extends fs.WriteStream {
  _destroy(err, cb) {
    // Writable's _construct serializes open with destroy, so by the time
    // _destroy fires either the fd is set or an open failure has surfaced
    // through `err`. Either way: delegate to super without fsync, or fsync
    // first then delegate.
    if (err || typeof this.fd !== 'number') return super._destroy(err, cb)
    fs.fsync(this.fd, (fsyncErr) => super._destroy(fsyncErr, cb))
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
