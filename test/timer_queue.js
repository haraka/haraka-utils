'use strict'

const { describe, it, afterEach, beforeEach } = require('node:test')
const assert = require('node:assert/strict')

const TimerQueue = require('../lib/timer_queue')

describe('TimerQueue', () => {
  let tq

  beforeEach(() => {
    tq = new TimerQueue(20)
  })

  afterEach(() => {
    tq.shutdown()
  })

  it('fires callbacks in due-time order', async () => {
    const fired = []
    tq.add('b', 60, () => fired.push('b'))
    tq.add('a', 30, () => fired.push('a'))
    tq.add('c', 90, () => fired.push('c'))

    await new Promise((resolve) => setTimeout(resolve, 150))
    assert.deepEqual(fired, ['a', 'b', 'c'])
    assert.equal(tq.length(), 0)
  })

  it('inserts an earlier item ahead of later ones', () => {
    tq.add('late', 1000, () => {})
    tq.add('early', 10, () => {})
    assert.equal(tq.queue[0].id, 'early')
    assert.equal(tq.queue[1].id, 'late')
  })

  it('append-to-tail fast path: equal/greater fire_time goes to end', () => {
    const first = tq.add('first', 100, () => {})
    const equal = tq.add('equal', 100, () => {})
    assert.equal(tq.queue[0], first)
    assert.equal(tq.queue[1], equal)
  })

  it('discard cancels a pending timer and removes it from the queue', async () => {
    let fired = false
    tq.add('keep', 1000, () => {})
    tq.add('drop', 30, () => {
      fired = true
    })
    const removed = tq.discard('drop')
    assert.equal(removed[0].id, 'drop')
    assert.equal(removed[0].cb, null)
    assert.equal(tq.length(), 1)

    await new Promise((resolve) => setTimeout(resolve, 80))
    assert.equal(fired, false)
  })

  it('discard of unknown id throws', () => {
    assert.throws(() => tq.discard('nope'), /not found/)
  })

  it('drain runs all remaining callbacks synchronously', () => {
    const fired = []
    tq.add('x', 10_000, () => fired.push('x'))
    tq.add('y', 20_000, () => fired.push('y'))
    tq.drain()
    assert.deepEqual(fired, ['x', 'y'])
    assert.equal(tq.length(), 0)
  })

  it('drain logs via injected logger when provided', () => {
    const captured = []
    const logged = new TimerQueue(20, {
      logger: { debug: (_, msg) => captured.push(msg) },
    })
    try {
      logged.add('one', 1000, () => {})
      logged.drain()
      assert.equal(captured.length, 1)
      assert.match(captured[0], /Draining 1 items/)
    } finally {
      logged.shutdown()
    }
  })

  it('fires nothing when no items are due', async () => {
    let fired = false
    tq.add('later', 10_000, () => {
      fired = true
    })
    await new Promise((resolve) => setTimeout(resolve, 80))
    assert.equal(fired, false)
    assert.equal(tq.length(), 1)
  })
})
