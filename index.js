'use strict';

const libqp = require('libqp');

// copied from http://www.broofa.com/Tools/Math.uuid.js
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    .split('');

exports.uuid = function () {
    const chars = CHARS;
    const uuid = new Array(36);
    let rnd=0;
    let r;
    for (let i = 0; i < 36; i++) {
        if (i===8 || i===13 || i===18 || i===23) {
            uuid[i] = '-';
        }
        else if (i===14) {
            uuid[i] = '4';
        }
        else {
            if (rnd <= 0x02) rnd = 0x2000000 + (Math.random()*0x1000000)|0;
            r = rnd & 0xf;
            rnd = rnd >> 4;
            uuid[i] = chars[(i === 19) ? (r & 0x3) | 0x8 : r];
        }
    }
    return uuid.join('');
}

exports.in_array = function (item, array) {
    if (!array) return false;
    if (!Array.isArray(array)) return false;
    return (array.indexOf(item) !== -1);
}

exports.to_object = function (array) {
    if (typeof array === 'string') {
        array = array.split(/[\s,;]+/);
    }
    if (!Array.isArray(array)) {
        throw "arguments to to_object must be a string or array";
    }
    const rv = {};
    for (let i = 0; i < array.length; i++) {
        if (array[i] === undefined) { continue; }
        rv[array[i]] = true;
    }
    return rv;
}

exports.sort_keys = function (obj) {
    return Object.keys(obj).sort();
}

exports.uniq = function (arr) {
    const out = [];
    for (let i=0; i < arr.length; i++) {
        if (out.includes(arr[i])) continue;
        out.push(arr[i]);
    }
    return out;
}

exports.extend = function (target) {
    // http://stackoverflow.com/questions/14974864/
    const sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        for (const prop in source) {
            target[prop] = source[prop];
        }
    });
    return target;
}

exports.ISODate = function (d) {
    function pad (n) { return n<10 ? `0${n}` : n; }
    return `${d.getUTCFullYear()}-\
${pad(d.getUTCMonth()+1)}-\
${pad(d.getUTCDate())}T\
${pad(d.getUTCHours())}:\
${pad(d.getUTCMinutes())}:\
${pad(d.getUTCSeconds())}Z`;
}

const _daynames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const _monnames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function _pad (num, n, p) {
    let s = `${num}`;
    p = p || '0';
    while (s.length < n) s = `${p}${s}`;
    return s;
}

exports.pad = _pad;

exports.date_to_str = function (d) {
    return `${_daynames[d.getDay()]}, ${_pad(d.getDate(),2)} \
${_monnames[d.getMonth()]} ${d.getFullYear()} \
${_pad(d.getHours(),2)}:${_pad(d.getMinutes(),2)}:\
${_pad(d.getSeconds(),2)} \
${d.toString().match(/\sGMT([+-]\d+)/)[1]}`;
}

exports.decode_qp = str => libqp.decode(str);

exports.encode_qp = str => libqp.wrap(libqp.encode(str));

exports.node_min = function (min, cur) {
    const wants = min.split('.');
    const has = (cur || process.version.substring(1)).split('.');

    for (let i=0; i<=3; i++) {
        // note use of unary + for fast type conversion to num
        if (+has[i] > +wants[i]) { return true;  }
        if (+has[i] < +wants[i]) { return false; }
    }

    // they're identical
    return true;
}

exports.existsSync =
    require(exports.node_min('0.8') ? 'fs' : 'path').existsSync;

exports.indexOfLF = function (buf, maxlength) {
    for (let i=0; i<buf.length; i++) {
        if (maxlength && (i === maxlength)) break;
        if (buf[i] === 0x0a) return i;
    }
    return -1;
}

exports.prettySize = function (size) {
    if (size === 0 || !size) return 0;
    const i = Math.floor(Math.log(size)/Math.log(1024));
    // https://wikipedia.org/wiki/Binary_prefix units with 1024 base
    // should use binary prefix
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    return `${(size/Math.pow(1024,i)).toFixed(2) * 1}${units[i]}`;
}

exports.valid_regexes = function (list, file) {
    // list: an array of regexes. file: the file name containing the regex list
    const valid = [];
    for (let i=0; i<list.length; i++) {
        try {
            new RegExp(list[i]);
        }
        catch (e) {
            console.error(`invalid regex in ${file}, ${list[i]}`);
            continue;
        }
        valid.push(list[i]);
    }
    return valid;  // returns a list of valid regexes
}

exports.regexp_escape = function (text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

exports.base64 = function (str) {
    return Buffer.from(str, 'UTF-8').toString('base64');
}

exports.unbase64 = function (str) {
    return Buffer.from(str, 'base64').toString('UTF-8');
}

// Fisher-Yates shuffle
// http://bost.ocks.org/mike/shuffle/
exports.shuffle = function (array) {
    let m = array.length;
    let t;
    let i;

    // While there remain elements to shuffle…
    while (m) {
        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);

        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }

    return array;
}

exports.elapsed = function (start, decimal_places) {
    const diff = (Date.now() - start) / 1000;  // in seconds

    if (decimal_places === undefined) {
        decimal_places = diff > 5 ? 0 : diff > 2 ? 1 : 2;
    }
    else {
        decimal_places = parseInt(decimal_places);
        if (isNaN(decimal_places)) {
            decimal_places = 2;
        }
    }
    return diff.toFixed(decimal_places);
}

exports.wildcard_to_regexp = function (str) {
    return `${str
        .replace(/[-[\]/{}()*+?.,\\^$|#\s]/g, "\\$&")
        .replace('\\*', '.*')
        .replace('\\?', '.')}$`;
}

exports.line_regexp = /^([^\n]*\n)/;
