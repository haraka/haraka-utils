'use strict'
// RFC 1869 command parser
//
// 6.  MAIL FROM and RCPT TO Parameters
//
//   esmtp-cmd        ::= inner-esmtp-cmd [SP esmtp-parameters] CR LF
//   esmtp-parameters ::= esmtp-parameter *(SP esmtp-parameter)
//   esmtp-parameter  ::= esmtp-keyword ["=" esmtp-value]
//   esmtp-keyword    ::= (ALPHA / DIGIT) *(ALPHA / DIGIT / "-")
//   esmtp-value      ::= 1*<any CHAR excluding "=", SP, and all
//                           control characters (US ASCII 0-31 inclusive)>
//   inner-esmtp-cmd  ::= ("MAIL FROM:" reverse-path) /
//                        ("RCPT TO:" forward-path)

/* eslint no-control-regex: 0 */
// Anchored at end. `\S+` (instead of `.*`) avoids the polynomial backtracking
const tail_token_re = /\s(\S+)$/
const param_form_re = /^[A-Za-z0-9][A-Za-z0-9-]*(?:=[^= \x00-\x1f]+)?$/

// Prefix matchers are anchored at start. Without `^`, a misrouted call like
// parse('mail', 'TO:<addr>') would silently no-op the replace and pass the
// `TO:<addr>` through as if it were the address.
const mail_prefix_re = /^from:\s*/i
const mail_prefix_strict_re = /^from:/i
const rcpt_prefix_re = /^to:\s*/i
const rcpt_prefix_strict_re = /^to:/i

exports.parse = (type, line, strict) => {
  let params = []
  line = String(line).trimEnd()

  const prefix_re =
    type === 'mail'
      ? strict
        ? mail_prefix_strict_re
        : mail_prefix_re
      : strict
        ? rcpt_prefix_strict_re
        : rcpt_prefix_re
  if (!prefix_re.test(line)) {
    const expected = type === 'mail' ? 'FROM:' : 'TO:'
    throw new Error(
      `Invalid format of ${type} command: missing ${expected} prefix`,
    )
  }
  line = line.replace(prefix_re, '')

  // Peel one trailing keyword[=value] token at a time. Each iteration is
  // linear in `line.length`; total is O(N * length), N = number of params.
  while (true) {
    const m = tail_token_re.exec(line)
    if (!m) break
    if (!param_form_re.test(m[1])) break
    params.push(m[1])
    line = line.slice(0, m.index).trimEnd()
  }

  params = params.reverse()

  // The above will "fail" (i.e. all of the line in params) on
  // some addresses without <> like
  //   MAIL FROM: user=name@example.net
  // or RCPT TO: postmaster
  if (line.length) {
    // A bracketed `<...>` blob is the address; its grammar is the
    // address parser's job, so let it through. Non-bracketed leftover that
    // still holds whitespace is trailing parameter junk we couldn't peel.
    if (/\s/.test(line) && !/^<.*>$/.test(line)) {
      throw new Error(`Syntax error in parameters ("${line}")`)
    }
    params.unshift(line)
  }

  line = params.shift() || ''
  if (strict && !line.match(/^<.*>$/)) {
    throw new Error(`Invalid format of ${type} command: ${line}`)
  }

  // Address grammar is validated by the caller's address parser,
  // both MAIL and RCPT. rfc1869 frames the command and normalises a
  // bare RCPT address to the `<addr>` wire form.
  if (type === 'mail') {
    if (!line.length) return ['<>'] // 'MAIL FROM:' --> 'MAIL FROM:<>'
  } else if (line.match(/@/) && !line.match(/^<.*>$/)) {
    line = `<${line}>`
  }

  params.unshift(line)
  return params
}
