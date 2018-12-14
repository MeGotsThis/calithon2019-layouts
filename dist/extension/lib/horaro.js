'use strict';

const cheerio = require('cheerio');
const request = require('request-promise').defaults({
  jar: true, // <= Automatically saves and re-uses cookies.
});

module.exports = {
  async getSchedule(scheduleId) {
    let runsHtml = await request({
      uri: `https://horaro.org/-/schedules/${scheduleId}`,
    });
    let $ = cheerio.load(runsHtml);
    return {
      runs: JSON.parse($('#h-item-data').contents().text()),
      csrfName: $('meta[name="csrf_token_name"]').attr('content'),
      csrfToken: $('meta[name="csrf_token"]').attr('content'),
      startTime: new Date($('.h-scheduler').data('start')),
      setupTime: $('.h-scheduler').data('setuptime'),
    };
  },

  async updateRunEstimate({scheduleId, runId, estimate, csrfName, csrfToken}) {
    await request({
      method: 'PATCH',
      uri: `https://horaro.org/-/schedules/${scheduleId}/items/${runId}`,
      body: {
        [csrfName]: csrfToken,
        length: estimate,
      },
      json: true,
    });
  },

  async updateRunData({scheduleId, runId, data, csrfName, csrfToken}) {
    await request({
      method: 'PATCH',
      uri: `https://horaro.org/-/schedules/${scheduleId}/items/${runId}`,
      body: {
        [csrfName]: csrfToken,
        columns: data,
      },
      json: true,
    });
  },

  async updateRunEstimateAndData(
      {scheduleId, runId, estimate, data, csrfName, csrfToken}) {
    await request({
      method: 'PATCH',
      uri: `https://horaro.org/-/schedules/${scheduleId}/items/${runId}`,
      body: {
        [csrfName]: csrfToken,
        length: estimate,
        columns: data,
      },
      json: true,
    });
  },
};
