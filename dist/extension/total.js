'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// Packages
const Pusher = require('pusher-js');
const equal = require('deep-equal');
const numeral = require('numeral');
const request = require("request-promise");
// Ours
const util_1 = require("./util");
const nodecgApiContext = require("./util/nodecg-api-context");
const nodecg = nodecgApiContext.get();
const tiltify = require('./tiltify');
const autoUpdateTotal = nodecg.Replicant('autoUpdateTotal');
const bitsTotal = nodecg.Replicant('bits:total');
const recordTrackerEnabled = nodecg.Replicant('recordTrackerEnabled');
const total = nodecg.Replicant('total');
const recentDonations = nodecg.Replicant('recentDonations', {
  defaultValue: [],
  persistent: false,
});
const readDonations = nodecg.Replicant('readDonations', {
  defaultValue: [],
});

autoUpdateTotal.on('change', (newVal) => {
    if (newVal) {
        nodecg.log.info('Automatic updating of donation total enabled');
        manuallyUpdateTotal(true);
    }
    else {
        nodecg.log.warn('Automatic updating of donation total DISABLED');
    }
});
recordTrackerEnabled.on('change', (newVal) => {
    if (newVal) {
        nodecg.log.info('Milestone tracker enabled');
    }
    else {
        nodecg.log.warn('Milestone tracker DISABLED');
    }
});
if (nodecg.bundleConfig && nodecg.bundleConfig.donation
    && nodecg.bundleConfig.donation.enabled) {
  const pusher = new Pusher(nodecg.bundleConfig.donation.pusherKey);
  const pusherableId = 'event-' + nodecg.bundleConfig.donation.slug;

  // Get initial data, then listen for donations.
  Promise.all([updateTotal(), loadRecentDonations()]).then(() => {
    let channel = pusher.subscribe('donation_updates');
    channel.bind('new_confirmed_donation', function(data) {
      if (pusherableId === data.pusherable_id) {
        newDonation(data);
      }
    });
  });
} else {
  nodecg.log.warn(
    `cfg/${nodecg.bundleName}.json is missing the "donation" property.`);
}

nodecg.listenFor('setTotal', ({ type, newValue }) => {
    if (type === 'cash') {
        total.value = {
            raw: parseFloat(newValue),
            formatted: util_1.formatDollars(newValue, { cents: false })
        };
    }
    else if (type === 'bits') {
        bitsTotal.value = parseInt(newValue, 10);
    }
    else {
        nodecg.log.error('Unexpected "type" sent to setTotal: "%s"', type);
    }
});
// Dashboard can invoke manual updates
nodecg.listenFor('updateTotal', manuallyUpdateTotal);
/**
 * Handles manual "updateTotal" requests.
 * @param [silent = false] - Whether to print info to logs or not.
 * @param [cb] - The callback to invoke after the total has been updated.
 */
function manuallyUpdateTotal(silent, cb) {
    if (!silent) {
        nodecg.log.info('Manual donation total update button pressed, invoking update...');
    }
    updateTotal().then(updated => {
        if (updated) {
            nodecg.sendMessage('total:manuallyUpdated', total.value);
            nodecg.log.info('Donation total successfully updated');
        }
        else {
            nodecg.log.info('Donation total unchanged, not updated');
        }
        if (cb) {
            cb(null, updated);
        }
    }).catch(error => {
        if (cb) {
            cb(error);
        }
    });
}
/**
 * Updates the "total" replicant with the latest value from the GDQ Tracker API.
 */
async function updateTotal() {
  let data = await tiltify.getEvent();

  let freshTotal = parseFloat(data.totalAmountRaised || 0);

  if (nodecg.bundleConfig
        && nodecg.bundleConfig.donation.mock
        && nodecg.bundleConfig.donation.mockInitialTotal !== null) {
    if (mockTotalAmount !== null) {
      return false;
    }
    freshTotal = nodecg.bundleConfig.donation.mockInitialTotal;
  }

  if (mockTotalAmount === null) {
    mockTotalAmount = freshTotal;
  }

  if (total.value.goalRaw != data.fundraiserGoalAmount) {
    total.value = {
      ...total.value,
      goalRaw: data.fundraiserGoalAmount,
      goalFormatted: util_1.formatDollars(data.fundraiserGoalAmount, {cents: false}),
    };
  }

  if (freshTotal === total.value.raw) {
    return false;
  }

  mockTotalAmount = freshTotal;

  total.value = {
    ...total.value,
    raw: freshTotal,
    formatted: util_1.formatDollars(freshTotal, {cents: false}),
    goalRaw: data.fundraiserGoalAmount,
    goalFormatted: util_1.formatDollars(data.fundraiserGoalAmount, {cents: false}),
  };
  return true;
}

function newDonation(data) {
  const donation = formatDonation({
    rawAmount: data.donation_amt,
    newTotal: data.display_total_amt_raised,
  });
  nodecg.sendMessage('donation', donation);

  if (autoUpdateTotal.value) {
    total.value = {
      ...total.value,
      raw: donation.rawNewTotal,
      formatted: donation.newTotal,
    };
  }

  // Update recent donations
  const recentDonations_ = [...recentDonations.value];
  recentDonations_.unshift(formatDonationFromPusher(data));
  while (recentDonations_.length > nodecg.bundleConfig.donation.recent) {
    recentDonations_.pop();
  }
  recentDonations.value = recentDonations_;
}

/**
 * Formats each donation coming in from the socket repeater, which in turn is receiving them
 * from a Postback URL on the tracker.
 * @returns A formatted donation.
 */
function formatDonation({ rawAmount, newTotal }) {
    const parsedRawAmount = typeof rawAmount === 'string' ? parseFloat(rawAmount) : rawAmount;
    const parsedRawNewTotal = typeof newTotal === 'string' ? parseFloat(newTotal) : newTotal;
    // Format amount
    let amount = util_1.formatDollars(parsedRawAmount);
    // If a whole dollar, get rid of cents
    if (amount.endsWith('.00')) {
        amount = amount.substr(0, amount.length - 3);
    }
    return {
        amount,
        rawAmount: parsedRawAmount,
        newTotal: util_1.formatDollars(parsedRawNewTotal, { cents: false }),
        rawNewTotal: parsedRawNewTotal
    };
}

async function loadRecentDonations() {
  const recentDonations_ =
    await tiltify.getDonations(nodecg.bundleConfig.donation.recent);

  const donations = recentDonations_.map(formatDonationFromApi);

  if (!equal(recentDonations.value, donations)) {
    recentDonations.value = donations;
  }
}

function formatDonationFromApi(donation) {
  return {
    id: donation.id,
    name: donation.name,
    comment: donation.comment,
    amount: numeral(donation.amount).format('$0,0[.]00'),
    rawAmount: donation.amount,
    when: donation.completedAt,
  };
}

function formatDonationFromPusher(donation) {
  return {
    id: parseInt(donation.id),
    name: donation.donor_name,
    comment: donation.donor_comment,
    amount: numeral(donation.donation_amt).format('$0,0[.]00'),
    rawAmount: donation.donation_amt,
    when: new Date(donation.display_created_at).getTime(),
  };
}

let mockTotalAmount = null;

if (nodecg.bundleConfig && nodecg.bundleConfig.donation
    && nodecg.bundleConfig.donation.mock) {
  let mockId = 0;
  const mockDonationComments = [
    null,
    null, // Double the chances to getting no messages
    'Best Game EVER',
    'I like donating to charity',
    'First time watching this. I\'m loving the runs',
    'Another great marathon! Keep up the good work!',
    'Thanks for the great event guys!',
    'FrankerZ FrankerZ FrankerZ FrankerZ FrankerZ FrankerZ FrankerZ FrankerZ',
    'nice',
    'I want to see the run!',
    'Chat said we should do this!',
    'Money goes to runner\'s choice',
    'Can\'t wait to see the VODs',
    'It\'s dangerous to go alone my dude, take this!',
    'Hey all, long time viewer here. Its so great to see how far much this '
      + 'event has grown over the years and how much you have raised',
    'You all rule! Long time watcher, first time donator!',
  ];

  setInterval(() => {
    mockId -= 1;
    const maxAmount = nodecg.bundleConfig.donation.mockAmount;
    let amount = Math.floor(Math.random() * (maxAmount - 1)) + 1;
    let commentIdx = Math.floor(Math.random() * mockDonationComments.length);
    let comment = mockDonationComments[commentIdx];
    mockTotalAmount += amount;
    newDonation({
      id: mockId,
      donor_name: 'Mocked Donation',
      donor_comment: comment,
      donation_amt: amount,
      display_total_amt_raised: mockTotalAmount,
      display_created_at: new Date().toString(),
    });
  }, nodecg.bundleConfig.donation.mockInterval * 1000);
}

//# sourceMappingURL=total.js.map
