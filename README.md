[![CI][ci-img]][ci-url]
[![Coverage Status][cov-img]][cov-url]
[![Code Climate][clim-img]][clim-url]
[![NPM][npm-img]][npm-url]

# haraka-utils

General purpose [haraka](https://haraka.github.io) utilities.

## Usage

```js
const utils = require('haraka-utils');
```

### getVersion (dir)

Gets the version of the NPM package located at dir. If the dir is a git repo, it also appends the commit ID.

```js
utils.getVersion('.'); // '1.1.2/45e3812'
```

## See Also

- [haraka-net-utils](https://www.npmjs.com/package/haraka-net-utils)

[ci-url]: https://github.com/haraka/haraka-utils/actions/workflows/ci.yml
[ci-img]: https://github.com/haraka/haraka-utils/actions/workflows/ci.yml/badge.svg
[cov-url]: https://codecov.io/github/haraka/haraka-utils?branch=master
[cov-img]: https://codecov.io/github/haraka/haraka-utils/coverage.svg
[clim-img]: https://codeclimate.com/github/haraka/haraka-utils/badges/gpa.svg
[clim-url]: https://codeclimate.com/github/haraka/haraka-utils
[npm-img]: https://nodei.co/npm/haraka-utils.png
[npm-url]: https://www.npmjs.com/package/haraka-utils
