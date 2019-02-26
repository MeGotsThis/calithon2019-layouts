'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// Packages
const clone = require('clone');
const equal = require("deep-equal");
const numeral = require("numeral");
const request = require("request-promise");
const BB = require("bluebird");
// Ours
const nodecgApiContext = require("./util/nodecg-api-context");
const tiltify = require('./tiltify');
const nodecg = nodecgApiContext.get();
const POLL_INTERVAL = 60 * 1000;
const currentBidsRep = nodecg.Replicant('currentBids', { defaultValue: [] });
const allBidsRep = nodecg.Replicant('allBids', { defaultValue: [] });
const schedule = nodecg.Replicant('schedule');
const total = nodecg.Replicant('total');
const bitsTotal = nodecg.Replicant('bits:total');
// Get latest bid data every POLL_INTERVAL milliseconds
update();
/**
 * Grabs the latest bids from the Tracker.
 */
async function update() {
    nodecg.sendMessage('bids:updating');
    const challengesPromise = tiltify.getChallenges();
    const pollsPromise = tiltify.getPolls();
    const milestonesPromise = tiltify.getMilestones();

    try {
      let [challengesJSON, pollsJSON, milestonesJSON] = await Promise.all([
        challengesPromise, pollsPromise, milestonesPromise,
      ]);
      const allBids = processRawBids(challengesJSON, pollsJSON, milestonesJSON);
      const currentBids = clone(allBids.filter((bid) => bid.state != 'CLOSED'));

      if (!equal(allBidsRep.value, allBids)) {
        allBidsRep.value = allBids;
      }

      if (!equal(currentBidsRep.value, currentBids)) {
        currentBidsRep.value = currentBids;
      }
    } catch (err) {
      nodecg.log.error('Error updating bids:', err);
    } finally {
      nodecg.sendMessage('bids:updated');
      setTimeout(update, POLL_INTERVAL);
    }
}
function processRawBids(challenges, polls, milestones) {
  const {challenges: challengesSchedule, polls: pollsSchedule} =
    getSpeedrunBids();

  return []
    .concat(challenges.map(formatChallenge(challengesSchedule)))
    .concat(polls.map(formatPoll(pollsSchedule)))
    .concat(milestones.map(formatMilestone))
    .sort(sortBidsBySpeedrunOrder);
}
const getSpeedrunBids = () => {
  let challenges = {};
  let polls = {};

  schedule.value.forEach((run, i) => {
    if (run.extra.challenges) {
      for (const id in run.extra.challenges) {
        if (challenges[id]) {
          nodecg.log.warn(
            `Challenge id ${id} has already beed used by run `
            + schedule.value[challenges[id]].name
            + ` and will be overwritten by ${run.name}`);
        }
        challenges[id] = i;
      }
    }
    if (run.extra.polls) {
      for (const id in run.extra.polls) {
        if (polls[id]) {
          nodecg.log.warn(
            `Poll id ${id} has already beed used by run `
            + schedule.value[polls[id]].name
            + ` and will be overwritten by ${run.name}`);
        }
        polls[id] = i;
      }
    }
  });

  return {challenges, polls};
};
const formatChallenge = (challengesSchedule) => {
  return (challenge) => _formatChallenge(challenge, challengesSchedule);
};

const _formatChallenge = (challenge, challengesSchedule) => {
  let idx = challengesSchedule[challenge.id];
  let order;
  let run = {};
  if (typeof idx == 'undefined') {
    nodecg.log.warn(
      `Found orphaned challenge id ${challenge.id}`);
    order = null;
  } else {
    run = schedule.value[idx];
    order = run.order;
  }
  let extra = ((run.extra || {}).challenges || {})[challenge.id] || {};
  const goalMet = challenge.totalAmountRaised >= challenge.amount;
  const state = goalMet || Date.now() > challenge.endsAt || !challenge.active ?
    'CLOSED' : 'OPEN';
  return {
    id: 'c-' + challenge.id,
    rawId: challenge.id,
    name: extra.name || challenge.name,
    description: extra.description || challenge.name,
    total: numeral(challenge.totalAmountRaised).format('$0,0[.]00'),
    rawTotal: parseFloat(challenge.totalAmountRaised),
    goal: numeral(challenge.amount).format('$0,0[.]00'),
    rawGoal: parseFloat(challenge.amount),
    goalMet,
    state,
    speedrun: run.order,
    type: 'challenge',

    isBitsChallenge: false,
  };
};

const formatPoll = (pollsSchedule) => {
  return (poll) => _formatPoll(poll, pollsSchedule);
};

const _formatPoll = (poll, pollsSchedule) => {
  let idx = pollsSchedule[poll.id];
  let order;
  let run = {};
  if (typeof idx == 'undefined') {
    nodecg.log.warn(
      `Found orphaned poll id ${poll.id}`);
    order = null;
  } else {
    run = schedule.value[idx];
    order = run.order;
  }
  let extra = ((run.extra || {}).polls || {})[poll.id] || {};
  const pollId = 'p-' + poll.id;
  const state = !poll.active ? 'CLOSED' : 'OPEN';
  let total_ = 0;
  let options = poll.options
    .map(formatOptions(pollId, extra))
    .sort((a, b) => b.rawTotal - a.rawTotal);

  return {
    id: pollId,
    rawId: poll.id,
    name: extra.name || poll.name,
    description: extra.description || poll.name,
    total: numeral(total_).format('$0,0[.]00'),
    rawTotal: parseFloat(total_),
    state,
    speedrun: run.order,
    type: options.length === 2 ? 'choice-binary' : 'choice-many',
    options,

    isBitsChallenge: false,
  };
};

const formatOptions = (pollId, runExtra) => {
  return (option) => _formatOptions(option, pollId, runExtra);
};

const _formatOptions = (option, pollId, runExtra) => {
  let optionExtra = (runExtra.options || {})[option.id] || {};
  return {
    id: 'o-' + option.id,
    rawId: option.id,
    parent: pollId,
    name: optionExtra.name || option.name,
    description: optionExtra.description || option.name,
    total: numeral(option.totalAmountRaised).format('$0,0[.]00'),
    rawTotal: parseFloat(option.totalAmountRaised),
  };
};

function sortBidsBySpeedrunOrder(a, b) {
  let diff;
  if (a.speedrun === b.speedrun) {
    diff = 0;
  } else if (a.speedrun === null) {
    diff = -1;
  } else if (b.speedrun === null) {
    diff = 1;
  } else {
    diff = a.speedrun - b.speedrun;
  }
  // If the speedrun is the same, compare by type
  if (diff == 0) {
    diff = a.id.charCodeAt(0) - b.id.charCodeAt(0);
  }
  // If the same type, compare by id
  if (diff == 0) {
    diff = a.rawId - b.rawId;
  }
  return diff;
}

const formatMilestone = (milestone) => {
  const milestoneId = 'm-' + milestone.id;
  const state = total.value.raw > milestone.amount ? 'CLOSED' : 'OPEN';

  return {
    id: milestoneId,
    rawId: milestone.id,
    name: milestone.name,
    goal: numeral(milestone.amount).format('$0,0[.]00'),
    rawGoal: parseFloat(milestone.amount),
    state,
    speedrun: null,
    type: 'milestone',
  };
};
//# sourceMappingURL=bids.js.map
