'use strict';

const cheerio = require('cheerio');
const request = require('request-promise').defaults({
  jar: true, // <= Automatically saves and re-uses cookies.
});
const entities = require('entities');

const LOGIN_URL = 'https://horaro.org/-/login';

const nodecg = require('./util/nodecg-api-context').get();
const loginLog = new nodecg.Logger(`${nodecg.bundleName}:tracker`);
let isFirstLogin = true;

// Fetch the login page, and run the response body through cheerio
// so we can extract the CSRF token from the hidden input field.
// Then, POST with our username, password, and the csrfmiddlewaretoken.
const loginToTracker = async () => {
  if (isFirstLogin) {
    loginLog.info('Logging in as %s...', nodecg.bundleConfig.tracker.username);
  } else {
    loginLog.info(
      'Refreshing tracker login session as %s...',
       nodecg.bundleConfig.tracker.username);
  }

  try {
    let response = await request({
      method: 'POST',
      uri: LOGIN_URL,
      form: {
        login: nodecg.bundleConfig.tracker.username,
        password: nodecg.bundleConfig.tracker.password,
      },
      simple: false,
      resolveWithFullResponse: true,
    });
    if (response.statusCode == 401) {
      throw new Error('Error authenticating on horaro.org');
    }
    if (isFirstLogin) {
      isFirstLogin = false;
      loginLog.info(
        'Logged in as %s.', nodecg.bundleConfig.tracker.username);
    } else {
      loginLog.info(
        'Refreshed session as %s.', nodecg.bundleConfig.tracker.username);
    }
  } catch (err) {
    loginLog.error('Error authenticating!\n', err);
    throw err;
  }
};

module.exports = {loginToTracker};
