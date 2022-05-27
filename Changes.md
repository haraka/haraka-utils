

### 1.0.3 - 2022-05-27

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
