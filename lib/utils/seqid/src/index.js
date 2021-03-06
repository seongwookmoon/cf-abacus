'use strict';

// A function that returns sequential time-based ids. The ids are formed from
// the current time, app index, cluster worker id, and a counter

const vcapenv = require('abacus-vcapenv');
const moment = require('abacus-moment');

const { extend } = require('underscore');

// Pad with zeroes up to 16 digits
const pad16 = (t) => {
  const trim = (s) =>
    s[0] === '0' && (s[1] >= '0' && s[1] <= '9')
      ? trim(s.substr(1))
      : s;
  const tt = trim(t.toString());
  const n = parseInt(tt).toString();
  const s = '0000000000000000' + n;
  return s.slice(s.length - 16) + tt.toString().substr(n.length);
};

const validateTimestamp = (timestamp) => {
  if (timestamp && !timestamp.toString().match(/^\d{13}$/))
    throw new Error('Not a timestamp');
};

const idElements = (time, count = 0) => {
  validateTimestamp(time);
  return [pad16(time), vcapenv.appindex(), vcapenv.iindex(), 0, count];
};

let id = {
  t: 0,
  c: 0
};

const bumpIDVariables = () => {
  const t = moment.now();

  if (t > id.t)
    // Bump time
    return {
      t: t,
      c: 0
    };

  // Bump counter
  return {
    t: id.t,
    c: id.c + 1
  };
};

// Return a unique time-based id string
const seqid = (timestamp) => {
  id = bumpIDVariables();
  const newId = idElements(id.t, id.c);

  if (timestamp) {
    validateTimestamp(timestamp);
    return [pad16(timestamp), ...newId].join('-');
  }

  return newId.join('-');
};

/* eslint-disable nodate/no-moment, nodate/no-new-date, nodate/no-date */
const samplingfn = {
  D: (t, n) => Math.floor(t / (86400000 * n)) * 86400000 * n,
  h: (t, n) => Math.floor(t / (3600000 * n)) * 3600000 * n,
  m: (t, n) => Math.floor(t / (60000 * n)) * 60000 * n,
  s: (t, n) => Math.floor(t / (1000 * n)) * 1000 * n,
  ms: (t, n) => Math.floor(t / n) * n,
  M: (t, n) => {
    const d = new Date(t);
    return Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / n) * n);
  }
};
/* eslint-enable nodate/no-moment, no-date/no-new-date, nodate/no-date */

const sample = (id, s) => {
  if (id === undefined || s === undefined) return id;
  const t = parseInt(id.split('-')[0]);
  const regex = /^[0-9]*[MDhms]$/;
  if (regex.test(s))
    return pad16(samplingfn[s.charAt(s.length - 1)](t, s.length > 1 ? parseInt(s.match(/^[0-9]+/)[0]) : 1));
  const n = parseInt(s);
  if (isNaN(n))
    throw extend(new Error('Invalid sampling value'), {
      code: 500,
      statusCode: 500,
      error: s + ' is not a valid sampling value'
    });
  return pad16(samplingfn.ms(t, parseInt(s)));
};

// Export our public functions
module.exports = seqid;
module.exports.pad16 = pad16;
module.exports.sample = sample;
