# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/).

### Unreleased

- test fixes to mollify codeql

### [2.1.0] - 2026-05-27

- feat(rfc1869): import from Haraka core
- feat(FsyncWriteStream): moved from Haraka outbound
- feat(TimerQueue): moved from Haraka outbound.
- feat(cram_md5_response): moved from Haraka outbound/hmail
- fix(extend): reject unsafe and ignore inherited enumerables
- fix(copyDir): use lstatSync and skip symlinks
- fix(wildcard_to_regexp): replaceAll so multi-wildcard patterns compile correctly
- fix(createFile): drop fd-leaking openSync/writeSync for writeFileSync
- fix(getVersion): drop the global cache
- fix(copyFile): use explicit existsSync + lstatSync; throw Error not string
- fix(mkDir): throw when path exists as a file
- chore(uuid): use `crypto.randomUUID()`
- chore(getGitCommitId): use `--format=%h`
- chore: existsSync is now unconditionally `fs.existsSync`

### [2.0.0] - 2026-05-18

- sunset fns removed: decode_qp, asQuotedPrintable, encode_qp
- test runner is node:test
- remove unnecessary done callbacks in synchronous tests #33

### [1.1.4] - 2025-01-31

- dep(eslint): upgrade to v9
- style(prettier): move config into package.json

### [1.1.3] - 2024-04-23

- doc(CONTRIBUTORS): added
- feat: added getGitCommitId & getVersion

### [1.1.2] - 2024-04-07

- doc(README): make haraka a link
- dep: eslint-plugin-haraka -> @haraka/eslint-config
- lint: update .eslintrc
- chore: update package.json scripts
- prettier

### [1.1.1] - 2024-04-05

- doc(CHANGELOG): renamed from changes
- package.json: include CHANGELOG in files

### [1.1.0] - 2024-04-05

- import from bin/haraka: copyFile, copyDir, mkDir, createFile
- add SUNSET 2025 warnings to unused qp functions

### [1.0.3] - 2022-05-27

- chore(ci): update with shared GHA workflows
- chore(ci): adjust codeclimate config
- chore(test): added tests for date_to_str, in_array, indexOfLF
- doc(README): fix badge URLs
- style: replace indexOf with includes (es6)
- style: replace for (i) with for..of
- style: \_pad uses str.padStart (avail since node 8)

### 1.0.2 - 2020-04-10

- CI tests:
  - replaced defunct nodeunit with mocha
  - replace Travis/Appveyor with githut workflows
  - use eslint 6
- uniq now works with unsorted lists
- update Buffer syntax, related to haraka/Haraka#2374
- es6 updates
- lint: compat updates for nodejs 6
- change names of 1024 base units to match IEC 80000-13:2008 standard #12

### 1.0.1 - 2017-06-16

- depend on haraka-eslint
- lint fixes for compat with eslint 4

[1.0.3]: https://github.com/haraka/haraka-utils/releases/tag/1.0.3
[1.1.0]: https://github.com/haraka/haraka-utils/releases/tag/v1.1.0
[1.1.1]: https://github.com/haraka/haraka-utils/releases/tag/v1.1.1
[1.1.2]: https://github.com/haraka/haraka-utils/releases/tag/v1.1.2
[1.1.3]: https://github.com/haraka/haraka-utils/releases/tag/v1.1.3
[1.1.4]: https://github.com/haraka/haraka-utils/releases/tag/v1.1.4
[2.0.0]: https://github.com/haraka/haraka-utils/releases/tag/v2.0.0
[2.1.0]: https://github.com/haraka/haraka-utils/releases/tag/v2.1.0
