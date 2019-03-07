'use strict';

const nodecg = require('./util/nodecg-api-context').get();

const gpmdConnected = nodecg.Replicant('gpmd-connected', {
  defaultValue: false,
  persistent: false,
});
const gpmd = nodecg.Replicant('gpmd', {
  defaultValue: {
    playState: false,
    time: null,
    track: null,
  },
  persistent: false,
});
const gpmdAuthorizationCode = nodecg.Replicant('gpmd-authorization-code', {
  defaultValue: null,
});
