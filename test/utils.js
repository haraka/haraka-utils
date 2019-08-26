
const utils     = require('../index');

function _set_up (callback) {
    // this.backup = {};
    callback();
}

function _tear_down (callback) {
    callback();
}

exports.uuid = {
    'generates a UUID of 36 characters' (test) {
        test.expect(1);
        const uuid = utils.uuid();
        test.equal(uuid.length, 36);
        test.done();
    },
    'contains only UUID chars' (test) {
        test.expect(1);
        const uuid = utils.uuid();
        test.ok(/[0-9A-Za-z-]/.test(uuid));
        test.done();
    }
}

exports.uniq = {
    'reduces an ordered array to unique elements' (test) {
        test.expect(1);
        const uniq = utils.uniq([1,1,2,2,3]);
        test.deepEqual(uniq, [1,2,3]);
        test.done();
    },
    // OOPS, doesn't work!
    // 'reduces a non-ordered array to unique elements': function (test) {
    //     test.expect(1);
    //     var uniq = utils.uniq([1,2,3,2,1]);
    //     test.deepEqual(uniq, [1,2,3]);
    //     test.done();
    // },
}

exports.encode_qp = {
    setUp : _set_up,
    tearDown : _tear_down,
    'plain ascii should not be encoded' (test) {
        test.expect(1);
        test.equals(utils.encode_qp('quoted printable'), 'quoted printable');
        test.done();
    },
    '8-bit chars should be encoded' (test) {
        test.expect(1);
        test.equals(
            utils.encode_qp(
                'v\xe5re kj\xe6re norske tegn b\xf8r \xe6res'
            ),
            'v=C3=A5re kj=C3=A6re norske tegn b=C3=B8r =C3=A6res');
        test.done();
    },
    'trailing space should be encoded' (test) {
        test.expect(5);
        test.equals(utils.encode_qp('  '), '=20=20');
        test.equals(utils.encode_qp('\tt\t'), '\tt=09');
        test.equals(
            utils.encode_qp('test  \ntest\n\t \t \n'),
            'test=20=20\ntest\n=09=20=09=20\n'
        );
        test.equals(utils.encode_qp("foo \t "), "foo=20=09=20");
        test.equals(utils.encode_qp("foo\t \n \t"), "foo=09=20\n=20=09");
        test.done();
    },
    'trailing space should be decoded unless newline' (test) {
        test.expect(2);
        test.deepEqual(utils.decode_qp("foo  "), new Buffer("foo  "));
        test.deepEqual(utils.decode_qp("foo  \n"), new Buffer("foo\n"));
        test.done();
    },
    '"=" is special and should be decoded' (test) {
        test.expect(2);
        test.equals(utils.encode_qp("=30\n"), "=3D30\n");
        test.equals(utils.encode_qp("\0\xff0"), "=00=C3=BF0");
        test.done();
    },
    'Very long lines should be broken' (test) {
        test.expect(1);
        test.equals(utils.encode_qp("The Quoted-Printable encoding is intended to represent data that largly consists of octets that correspond to printable characters in the ASCII character set."), "The Quoted-Printable encoding is intended to represent data that largly con=\nsists of octets that correspond to printable characters in the ASCII charac=\nter set.");
        test.done();
    },
    'multiple long lines' (test) {
        test.expect(1);
        test.equals(utils.encode_qp("College football is a game which would be much more interesting if the faculty played instead of the students, and even more interesting if the\ntrustees played.  There would be a great increase in broken arms, legs, and necks, and simultaneously an appreciable diminution in the loss to humanity. -- H. L. Mencken"), "College football is a game which would be much more interesting if the facu=\nlty played instead of the students, and even more interesting if the\ntrustees played.  There would be a great increase in broken arms, legs, and=\n necks, and simultaneously an appreciable diminution in the loss to humanit=\ny. -- H. L. Mencken");
        test.done();
    },
    "Don't break a line that's near but not over 76 chars" (test) {
        const buffer = `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\
xxxxxxxxxxxxxxxxxx`;
        test.equals(utils.encode_qp(`${buffer}123`), `${buffer}123`);
        test.equals(utils.encode_qp(`${buffer}1234`), `${buffer}1234`);
        test.equals(utils.encode_qp(`${buffer}12345`), `${buffer}12345`);
        test.equals(utils.encode_qp(`${buffer}123456`), `${buffer}123456`);
        test.equals(utils.encode_qp(`${buffer}1234567`), `${buffer}12345=\n67`);
        test.equals(utils.encode_qp(`${buffer}123456=`), `${buffer}12345=\n6=3D`);
        test.equals(utils.encode_qp(`${buffer}123\n`), `${buffer}123\n`);
        test.equals(utils.encode_qp(`${buffer}1234\n`), `${buffer}1234\n`);
        test.equals(utils.encode_qp(`${buffer}12345\n`), `${buffer}12345\n`);
        test.equals(utils.encode_qp(`${buffer}123456\n`), `${buffer}123456\n`);
        test.equals(utils.encode_qp(`${buffer}1234567\n`), `${buffer}12345=\n67\n`);
        test.equals(
            utils.encode_qp(`${buffer}123456=\n`), `${buffer}12345=\n6=3D\n`
        );
        test.done();
    },
    'Not allowed to break =XX escapes using soft line break' (test) {
        test.expect(10);
        const buffer = `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\
xxxxxxxxxxxxxxxxxx`;
        test.equals(
            utils.encode_qp(`${buffer}===xxxxx`), `${buffer}=3D=\n=3D=3Dxxxxx`
        );
        test.equals(
            utils.encode_qp(`${buffer}1===xxxx`), `${buffer}1=3D=\n=3D=3Dxxxx`
        );
        test.equals(
            utils.encode_qp(`${buffer}12===xxx`), `${buffer}12=3D=\n=3D=3Dxxx`
        );
        test.equals(
            utils.encode_qp(`${buffer}123===xx`), `${buffer}123=\n=3D=3D=3Dxx`
        );
        test.equals(
            utils.encode_qp(`${buffer}1234===x`), `${buffer}1234=\n=3D=3D=3Dx`
        );
        test.equals(utils.encode_qp(`${buffer}12=\n`), `${buffer}12=3D\n`);
        test.equals(utils.encode_qp(`${buffer}123=\n`), `${buffer}123=\n=3D\n`);
        test.equals(utils.encode_qp(`${buffer}1234=\n`), `${buffer}1234=\n=3D\n`);
        test.equals(utils.encode_qp(`${buffer}12345=\n`), `${buffer}12345=\n=3D\n`);
        test.equals(
            utils.encode_qp(`${buffer}123456=\n`), `${buffer}12345=\n6=3D\n`
        );
        test.done();
    },
    'some extra special cases we have had problems with' (test) {
        test.expect(2);
        const buffer = `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\
xxxxxxxxxxxxxxxxxx`;
        test.equals(utils.encode_qp(`${buffer}12=x=x`), `${buffer}12=3D=\nx=3Dx`);
        test.equals(
            utils.encode_qp(`${buffer}12345${buffer}12345${buffer}123456\n`),
            `${buffer}12345=\n${buffer}12345=\n${buffer}123456\n`
        );
        test.done();
    },
    'regression test 01' (test) {
        test.expect(1);
        test.deepEqual(
            utils.decode_qp("foo  \n\nfoo =\n\nfoo=20\n\n"),
            new Buffer("foo\n\nfoo \nfoo \n\n")
        );
        test.done();
    },
    'regression test 01 with CRLF' (test) {
        test.expect(1);
        test.deepEqual(
            utils.decode_qp("foo  \r\n\r\nfoo =\r\n\r\nfoo=20\r\n\r\n"),
            new Buffer("foo\n\nfoo \nfoo \n\n")
        );
        test.done();
    },
    'regression test 02' (test) {
        test.expect(1);
        test.deepEqual(
            utils.decode_qp("foo = \t\x20\nbar\t\x20\n"),
            new Buffer("foo bar\n")
        );
        test.done();
    },
    'regression test 02 with CRLF' (test) {
        test.expect(1);
        test.deepEqual(
            utils.decode_qp("foo = \t\x20\r\nbar\t\x20\r\n"),
            new Buffer("foo bar\n")
        );
        test.done();
    },
    'regression test 03' (test) {
        test.expect(1);
        test.deepEqual(
            utils.decode_qp("foo = \t\x20\n"), new Buffer("foo ")
        );
        test.done();
    },
    'regression test 03 with CRLF' (test) {
        test.expect(1);
        test.deepEqual(
            utils.decode_qp("foo = \t\x20\r\n"), new Buffer("foo ")
        );
        test.done();
    },
    'regression test 04 from CRLF to LF' (test) {
        test.expect(1);
        test.deepEqual(
            utils.decode_qp("foo = \t\x20y\r\n"), new Buffer("foo = \t\x20y\n")
        );
        test.done();
    },
    'regression test 05 should be the same' (test) {
        test.expect(1);
        test.deepEqual(
            utils.decode_qp("foo =xy\n"), new Buffer("foo =xy\n")
        );
        test.done();
    },
    'spin encode_qp()' (test) {
        const spin = 10000;
        test.expect(spin);
        for (let i = 0; i < spin; i++) {
            test.equals(
                utils.encode_qp("quoted printable"), "quoted printable"
            );
        }
        test.done();
    }
};

exports.valid_regexes = {
    setUp : _set_up,
    tearDown : _tear_down,
    'two valid' (test) {
        const re_list = ['.*.exam.ple','.*.example.com'];
        test.expect(1);
        test.deepEqual(re_list, utils.valid_regexes(re_list));
        test.done();
    },
    'one valid, one invalid' (test) {
        const re_list = ['*.exam.ple','.*.example.com'];
        test.expect(1);
        test.deepEqual(['.*.example.com'], utils.valid_regexes(re_list));
        test.done();
    },
    'one valid, two invalid' (test) {
        const re_list = ['[', '*.exam.ple','.*.example.com'];
        test.expect(1);
        test.deepEqual(['.*.example.com'], utils.valid_regexes(re_list));
        test.done();
    },
};

exports.base64 = {
    setUp : _set_up,
    tearDown : _tear_down,
    'base64' (test) {
        test.expect(1);
        test.equal(utils.base64('matt the tester'), 'bWF0dCB0aGUgdGVzdGVy');
        test.done();
    },
    'unbase64' (test) {
        test.expect(1);
        test.equal(utils.unbase64('bWF0dCB0aGUgdGVzdGVy'), 'matt the tester');
        test.done();
    }
};

exports.to_object = {
    setUp : _set_up,
    tearDown : _tear_down,
    'string' (test) {
        test.expect(1);
        test.deepEqual(utils.to_object('matt,test'),
            { matt: true, test: true }
        );
        test.done();
    },
    'array' (test) {
        test.expect(1);
        test.deepEqual(utils.to_object(['matt','test']),
            { matt: true, test: true }
        );
        test.done();
    },
};

exports.extend = {
    'copies properties from one object' (test) {
        test.expect(1);
        const both = utils.extend({first: 'boo'}, {second: 'ger'});
        test.deepEqual({first: 'boo', second: 'ger'}, both);
        test.done();
    },
    'copies properties from multiple objects' (test) {
        test.expect(1);
        test.deepEqual(
            utils.extend(
                {first: 'boo'}, {second: 'ger'}, {third: 'eat'}
            ),
            {first: 'boo', second: 'ger', third: 'eat'}
        );
        test.done();
    },
};

exports.node_min = {
    'node is new enough' (test) {
        test.expect(6);
        test.ok(utils.node_min('0.8.0',  '0.10.0'));
        test.ok(utils.node_min('0.10.0', '0.10.0'));
        test.ok(utils.node_min('0.10.0', '0.10.1'));
        test.ok(utils.node_min('0.10.0', '0.12.0'));
        test.ok(utils.node_min('0.10.0', '1.0.0'));
        test.ok(utils.node_min('0.10',   '1.0'));
        test.done();
    },
    'node is too old' (test) {
        test.expect(4);
        test.ok(!utils.node_min('0.12.0', '0.10.0'));
        test.ok(!utils.node_min('1.0.0',  '0.8.0'));
        test.ok(!utils.node_min('1.0.0',  '0.10.0'));
        test.ok(!utils.node_min('1.0.0',  '0.12.0'));
        test.done();
    },
};

exports.elapsed = {
    'returns 0 decimal places' (test) {
        test.expect(1);
        const start = new Date();
        start.setTime(start.getTime() - 3517);   // 3.517 seconds ago
        test.strictEqual(utils.elapsed(start, 0), '4');
        test.done();
    },
    'returns 1 decimal place' (test) {
        test.expect(1);
        const start = new Date();
        start.setTime(start.getTime() - 3517);   // 3.517 seconds ago
        test.strictEqual(utils.elapsed(start, 1), '3.5');
        test.done();
    },
    'returns 2 decimal places' (test) {
        test.expect(1);
        const start = new Date();
        start.setTime(start.getTime() - 3517);   // 3.517 seconds ago
        test.strictEqual(utils.elapsed(start, 2), '3.52');
        test.done();
    },
    'default N > 5 has 0 decimal places' (test) {
        test.expect(1);
        const start = new Date();
        start.setTime(start.getTime() - 13517);   // 3.517 seconds ago
        test.strictEqual(utils.elapsed(start), '14');
        test.done();
    },
    'default N > 2 has 1 decimal places' (test) {
        test.expect(1);
        const start = new Date();
        start.setTime(start.getTime() - 3517);   // 3.517 seconds ago
        test.strictEqual(utils.elapsed(start), '3.5');
        test.done();
    },
    'default has 2 decimal places' (test) {
        test.expect(1);
        const start = new Date();
        start.setTime(start.getTime() - 1517);   // 3.517 seconds ago
        test.strictEqual(utils.elapsed(start), '1.52');
        test.done();
    },
};

exports.prettySize = {
    // https://wikipedia.org/wiki/Binary_prefix units with 1024 base
    // should use binary prefix
    'formats into 1024 sized KiB' (test) {
        test.expect(1);
        test.equal(utils.prettySize(10000), '9.77KiB');
        test.done();
    },
    'formats into 1024 sized MiB' (test) {
        test.expect(1);
        test.equal(utils.prettySize(10000000), '9.54MiB');
        test.done();
    },
    'formats into 1024 sized GiB' (test) {
        test.expect(1);
        test.equal(utils.prettySize(10000000000), '9.31GiB');
        test.done();
    },
    'formats into 1024 sized TiB' (test) {
        test.expect(1);
        test.equal(utils.prettySize(10000000000000), '9.09TiB');
        test.done();
    },
}
exports.shuffle = {
    'randomly returns an element from an array' (test) {
        test.expect(2);
        test.equal(utils.shuffle(['only']), 'only');
        test.ok(typeof utils.shuffle(['one','two']), 'string');
        test.done();
    },
}
