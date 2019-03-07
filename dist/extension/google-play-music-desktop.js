'use strict';

const WebSocket = require('ws');

const nodecg = require('./util/nodecg-api-context').get();

const NAME = 'Calithon Layouts';

const CONNECTION_FREQUENCY = 1000;

let connection = null;

const gpmdConnected = nodecg.Replicant('gpmd-connected');
const gpmd = nodecg.Replicant('gpmd');
const gpmdAuthorizationCode = nodecg.Replicant('gpmd-authorization-code');

const logDataToFile = {
  'playlists': 'gpmdp-playlists.json',
  'library': 'gpmdp-library.json',
};

const requestCallbacks = {};
let requestID = 1;

gpmdConnected.on('change', (v) => {
  nodecg.log.info('gmpdConnected changed to ' + v);
});

checkGoogleMusicPlayerDesktop();
setInterval(checkGoogleMusicPlayerDesktop, CONNECTION_FREQUENCY);

function checkGoogleMusicPlayerDesktop() {
  if (connection) {
    if (connection.readyState == connection.OPEN
        || connection.readyState == connection.CONNECTING) {
      return;
    }
  }
  let address = 'localhost';
  let port = 5672;
  connection = new WebSocket(`ws://${address}:${port}/`);
  connection.on('open', function() {
    gpmdConnected.value = true;
    sendConnect();
  }).on('message', function(data) {
    let jData = JSON.parse(data);
    if (jData.channel === 'connect') {
      // Handle connection specific messages
      if (jData.payload === 'CODE_REQUIRED') {
        nodecg.log.info(
          'Google Play Music Desktop Player authorization required...');
        gpmdAuthorizationCode.value = null;
      } else {
        nodecg.log.info(
          'Saving Google Play Music Desktop Player authorization token...');
        gpmdAuthorizationCode.value = jData.payload;
        sendConnect();
      }
    } else if (jData.requestID) {
      if (jData.type === 'error') {
        if (requestCallbacks[jData.requestID].err) {
          requestCallbacks[jData.requestID].err(jData);
        }
      } else {
        if (requestCallbacks[jData.requestID].cb) {
          requestCallbacks[jData.requestID].cb(jData);
        }
      }
      delete requestCallbacks[jData.requestID];
    } else if (logDataToFile[jData.channel]) {
      let fs = require('fs');
      fs.writeFile(
        logDataToFile[jData.channel],
        JSON.stringify(jData.payload, null, 2), () => {});
    } else if ((typeof gpmd.value[jData.channel]) !== 'undefined') {
      gpmd.value[jData.channel] = jData.payload;
    }
  }).on('error', function(err) {
    gpmdConnected.value = false;
    connection = null;
  }).on('close', function() {
    gpmdConnected.value = false;
    connection = null;
  });
}

nodecg.listenFor('gpmd:authorization', (data, cb) => {
  nodecg.log.info(
    'Sending Google Play Music Desktop Player authorization code...');
  send({
    'namespace': 'connect',
    'method': 'connect',
    'arguments': [NAME, data],
  });
});

const sendConnect = () => {
  send({
    'namespace': 'connect',
    'method': 'connect',
    'arguments': [NAME, gpmdAuthorizationCode.value],
  }, gpmdAuthorizationCode.value ? connectCallback : undefined);
};

const connectCallback = () => {
  if (!nodecg.bundleConfig.googlePlayMusic.forcePlay
      || !nodecg.bundleConfig.googlePlayMusic.forcePlay.enabled) {
    return;
  }
  sendWithCallback({
    'namespace': 'playback',
    'method': 'getPlaybackState',
  }, (data) => {
    if (data.type == 'error') {
      return;
    }
    if (data.value == 0) {
      const {type, id, shuffle, repeat} =
        nodecg.bundleConfig.googlePlayMusic.forcePlay;
      if (type === 'playlists') {
        sendWithCallback({
          'namespace': 'playlists',
          'method': 'getAll',
        }, (data) => {
          let playlist = data.value.find((v) => v.id == id);
          if (!playlist) {
            return;
          }
          send({
            'namespace': 'playlists',
            'method': 'play',
            'arguments': [playlist],
          }, sendCallback({
            'namespace': 'playback',
            'method': 'setShuffle',
            'arguments': [shuffle],
          }, sendCallback({
            'namespace': 'playback',
            'method': 'setRepeat',
            'arguments': [repeat],
          })));
        });
      }
    } else if (data.value == 1) {
      send({
        'namespace': 'playback',
        'method': 'playPause',
      });
    }
  });
};

const send = (data, cb) => {
  connection.send(JSON.stringify({
    ...data,
  }), null, cb);
};

const sendCallback = (data, cb) => {
  return () => send(data, cb);
};

const sendWithCallback = (data, cb, err) => {
  requestCallbacks[requestID] = {cb, err};
  connection.send(JSON.stringify({
    ...data,
    requestID: requestID,
  }));
  requestID += requestID;
};
