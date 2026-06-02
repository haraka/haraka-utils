'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const { parse } = require('../lib/rfc1869')

function _check(line, expected) {
  const match = /^(MAIL|RCPT)\s+(.*)$/.exec(line)
  const parsed = parse(match[1].toLowerCase(), match[2])
  assert.deepEqual(parsed, expected)
}

describe('rfc1869', () => {
  describe('valid parse cases', () => {
    const validCases = [
      // MAIL FROM variants
      ['MAIL FROM:<>', ['<>']],
      ['MAIL FROM:', ['<>']],
      ['MAIL FROM:<postmaster>', ['<postmaster>']],
      ['MAIL FROM:user', ['user']],
      ['MAIL FROM:user size=1234', ['user', 'size=1234']],
      ['MAIL FROM:user@domain size=1234', ['user@domain', 'size=1234']],
      ['MAIL FROM:<user@domain> size=1234', ['<user@domain>', 'size=1234']],
      ['MAIL FROM:<user@domain> somekey', ['<user@domain>', 'somekey']],
      [
        'MAIL FROM:<user@domain> somekey other=foo',
        ['<user@domain>', 'somekey', 'other=foo'],
      ],
      // RFC 1652 BODY extension keyword
      [
        'MAIL FROM:<user@domain> BODY=8BITMIME',
        ['<user@domain>', 'BODY=8BITMIME'],
      ],
      // RFC 6531 SMTPUTF8 keyword (no value)
      ['MAIL FROM:<user@domain> SMTPUTF8', ['<user@domain>', 'SMTPUTF8']],
      // RCPT TO variants
      ['RCPT TO: 0@mailblog.biz 0=9 1=9', ['<0@mailblog.biz>', '0=9', '1=9']],
      [
        'RCPT TO:<r86x-ray@emailitin.com> state=1',
        ['<r86x-ray@emailitin.com>', 'state=1'],
      ],
      [
        'RCPT TO:<user=name@domain.com> foo=bar',
        ['<user=name@domain.com>', 'foo=bar'],
      ],
      ['RCPT TO:<postmaster>', ['<postmaster>']],
      ['RCPT TO:<abuse>', ['<abuse>']],
    ]

    for (const [line, expected] of validCases) {
      it(line, () => _check(line, expected))
    }
  })

  describe('error cases', () => {
    const throwCases = [
      {
        desc: "MAIL parse rejects a 'TO:' prefix",
        args: ['mail', 'TO:<user@domain>'],
      },
      {
        desc: "RCPT parse rejects a 'FROM:' prefix",
        args: ['rcpt', 'FROM:<user@domain>'],
      },
      {
        desc: 'unbracketed trailing junk that is neither address nor param',
        args: ['rcpt', 'TO: user @domain bad'],
      },
    ]

    for (const { desc, args } of throwCases) {
      it(`throws: ${desc}`, () => {
        assert.throws(() => parse(...args), Error)
      })
    }
  })

  // Address-grammar validation is deferred to the caller's address parser
  describe('address grammar deferred to caller', () => {
    const deferredCases = [
      ['mail', 'FROM:<user@dom ain>', ['<user@dom ain>']],
      ['mail', 'FROM:<user name@domain>', ['<user name@domain>']],
      ['rcpt', 'TO:unknown', ['unknown']],
      ['rcpt', 'TO:<foo>', ['<foo>']],
    ]
    for (const [type, line, expected] of deferredCases) {
      it(`${type.toUpperCase()} ${line} parses, defers validation`, () => {
        assert.deepEqual(parse(type, line), expected)
      })
    }
  })

  describe('strict mode', () => {
    const strictValidCases = [
      ['mail', 'FROM:<user@domain.com>', '<user@domain.com>'],
      ['rcpt', 'TO:<user@domain.com>', '<user@domain.com>'],
    ]
    for (const [type, line, expected] of strictValidCases) {
      it(`strict ${type.toUpperCase()} with angle brackets accepts address`, () => {
        const result = parse(type, line, true)
        assert.equal(result[0], expected)
      })
    }

    const strictThrowCases = [
      ['mail', 'FROM:user@domain.com'],
      ['rcpt', 'TO:user@domain.com'],
    ]
    for (const [type, line] of strictThrowCases) {
      it(`strict ${type.toUpperCase()} without angle brackets throws`, () => {
        assert.throws(() => parse(type, line, true), Error)
      })
    }
  })
})
