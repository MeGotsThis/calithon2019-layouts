'use strict';

const cheerio = require('cheerio');
const request = require('request-promise').defaults({
  jar: true, // <= Automatically saves and re-uses cookies.
});
const entities = require('entities');

const nodecg = require('./util/nodecg-api-context').get();

let username;
let campaign;
let campaignId;
let csfrToken;

const loadCsfrToken = async () => {
  let response = await request({
    method: 'GET',
    uri: 'https://tiltify.com/events/' + nodecg.bundleConfig.donation.slug,
    simple: false,
    resolveWithFullResponse: true,
  });

  let $ = cheerio.load(response.body);
  csfrToken = $('meta[name="csrf-token"]').attr('content');
  [, username, campaign] = response.request.uri.path.split('/');
  if (username[0] == '@') {
    username = username.substring(1);
  }

  let data = await request({
    method: 'GET',
    uri:
      `https://tiltify.com/api/v3/users/${username}/campaigns/`
      + `${nodecg.bundleConfig.donation.slug}`,
    json: true,
  });
  campaignId = data.data.id;
};

const getEvent = async () => {
  if (!username) {
    return undefined;
  }

  let data = await request({
    method: 'GET',
    uri:
      `https://tiltify.com/api/v3/users/${username}/campaigns/`
      + `${nodecg.bundleConfig.donation.slug}`,
    json: true,
  });
  return data.data;
};

const getChallenges = async () => {
  if (!campaignId) {
    return undefined;
  }

  let data = await request({
    method: 'GET',
    uri: `https://tiltify.com/api/v3/campaigns/${campaignId}/challenges`,
    headers: {
      'X-CSRF-Token': csfrToken,
    },
    json: true,
  });
  return data.data;
};

const getPolls = async () => {
  if (!campaignId) {
    return undefined;
  }

  let data = await request({
    method: 'GET',
    uri: `https://tiltify.com/api/v3/campaigns/${campaignId}/polls`,
    headers: {
      'X-CSRF-Token': csfrToken,
    },
    json: true,
  });
  return data.data;
};

const getMilestones = async () => {
  if (!campaignId) {
    return undefined;
  }

  let data = await request({
    method: 'GET',
    uri: `https://tiltify.com/api/v3/campaigns/${campaignId}/milestones`,
    headers: {
      'X-CSRF-Token': csfrToken,
    },
    json: true,
  });
  return data.data;
};

const getRewards = async () => {
  if (!campaignId) {
    return undefined;
  }

  let data = await request({
    method: 'GET',
    uri: `https://tiltify.com/api/v3/campaigns/${campaignId}/rewards`,
    headers: {
      'X-CSRF-Token': csfrToken,
    },
    json: true,
  });
  return data.data;
};

const getDonations = async (count = 10) => {
  if (!campaignId) {
    return undefined;
  }

  let data = await request({
    method: 'GET',
    uri:
      `https://tiltify.com/api/v3/campaigns/${campaignId}/donations?`
      + `count=${count}`,
    headers: {
      'X-CSRF-Token': csfrToken,
    },
    json: true,
  });
  return data.data;
};

module.exports = {
  loadCsfrToken,
  getEvent,
  getChallenges,
  getPolls,
  getMilestones,
  getRewards,
  getDonations,
};
