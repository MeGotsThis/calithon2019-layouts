const clone = require('clone');
const EventEmitter = require('events');

const nodecg = require('./util/nodecg-api-context').get();
const TimeUtils = require('./lib/time');
const HoraroUtils = require('./lib/horaro');

const checklistComplete = nodecg.Replicant('checklistComplete');
const stopwatch = nodecg.Replicant('stopwatch');
const currentRunRep = nodecg.Replicant('currentRun');
const nextRunRep = nodecg.Replicant('nextRun');
const scheduleRep = nodecg.Replicant('schedule');
const scheduleProperties = nodecg.Replicant('scheduleProperties', {
  defaultValue: {
    startTime: 0,
    setupTime: 0,
  },
});
const timeTracking = nodecg.Replicant('timeTracking', {
  defaultValue: {
    startTime: {
      first: null,
      firstCompleted: null,
      last: null,
    },
    finishTime: {
      first: null,
      firstDuration: null,
      last: null,
      lastDuration: null,
    },
  },
});
const updateHoraro = nodecg.Replicant('updateHoraro', {
  defaultValue: true,
});

const STOPWATCH_STATES = {
  NOT_STARTED: 'not_started',
  RUNNING: 'running',
  PAUSED: 'paused',
  FINISHED: 'finished',
};

const SCHEDULE_MODE = {
  NORMAL: 'NORMAL',
  MULTI_PARTS: 'MULTI_PARTS',
  CUSTOM: 'CUSTOM',
};

const events = new EventEmitter();

let csrfName;
let csrfToken;

updateHoraro.on('change', (newVal) => {
  if (newVal) {
    nodecg.log.info('Automatic updating of Horaro Schedule enabled');
  } else {
    nodecg.log.warn('Automatic updating of Horaro Schedule DISABLED');
  }
});

nodecg.listenFor('setStartTime', async ({value}) => {
  if (currentRunRep.value.order === 0) {
    return;
  }
  if (!timeTracking.value.startTime.first) {
    return;
  }

  const run = currentRunRep.value;
  const prevRun = [...scheduleRep.value].reverse().find((item) => {
    if (item.type !== 'run') {
      return false;
    }

    return item.order < run.order;
  });

  const now = value;
  let runStartTime = new Date(scheduleProperties.value.startTime);
  scheduleRep.value.forEach((item) => {
    if (item.order < run.order) {
      runStartTime.setSeconds(runStartTime.getSeconds() + item._horaroEstimate);
    }
  });
  let offset = Math.floor((now - runStartTime.getTime()) / 1000);
  let prevSetupTime = TimeUtils.parseTimeString(prevRun.setupTime) / 1000;
  const {id: scheduleId, setupTime} = nodecg.bundleConfig.tracker.schedule;
  let horaroEstimate = prevRun._horaroEstimate + offset;
  let formattedSetupTime = TimeUtils.formatSeconds(
    prevSetupTime + offset, {showHours: true});
  if (horaroEstimate < 0) {
    throw new Error(
      `Run ${prevRun.id} (${prevRun.name}) cannot have negative Horaro `
      + `estimate of ${horaroEstimate}`);
  }
  await HoraroUtils.updateRunEstimateAndData({
    scheduleId,
    runId: prevRun.id,
    estimate: horaroEstimate,
    data: {
      [setupTime]: formattedSetupTime,
    },
    csrfName,
    csrfToken,
  });
  events.emit('horaro-updated');
});

nodecg.listenFor('setRunTime', async ({value}) => {
  if (timeTracking.value.startTime.first) {
    return;
  }

  const run = currentRunRep.value;
  const prevRun = [...scheduleRep.value].reverse().find((item) => {
    if (item.type !== 'run') {
      return false;
    }

    return item.order < run.order;
  });

  let runRunTime = Math.floor(value / 1000);
  let setupTime = TimeUtils.parseTimeString(prevRun.setupTime) / 1000;
  const {id: scheduleId, runTime} = nodecg.bundleConfig.tracker.schedule;
  let horaroEstimate = runRunTime + setupTime;
  let formattedRunTime = TimeUtils.formatSeconds(runRunTime, {showHours: true});
  if (horaroEstimate < 0) {
    throw new Error(
      `Run ${prevRun.id} (${prevRun.name}) cannot have negative Horaro `
      + `estimate of ${horaroEstimate}`);
  }
  await HoraroUtils.updateRunEstimateAndData({
    scheduleId,
    runId: prevRun.id,
    estimate: runRunTime + setupTime,
    data: {
      [runTime]: formattedRunTime,
    },
    csrfName,
    csrfToken,
  });
  events.emit('horaro-updated');
});

const getScheduleModeFromRun = (run) => {
  const mode = run.extra.scheduleMode || SCHEDULE_MODE.NORMAL;
  if (!SCHEDULE_MODE[mode]) {
    return SCHEDULE_MODE.CUSTOM;
  }
  return mode;
};

const getSchedule = async (scheduleId) => {
  let {runs, csrfName: csrfName_, csrfToken: csrfToken_,
      startTime, setupTime} =
    await HoraroUtils.getSchedule(scheduleId);
  csrfName = csrfName_;
  csrfToken = csrfToken_;
  scheduleProperties.value = {
    startTime: startTime.getTime(),
    setupTime,
  };
  return runs;
};

const validatedEstimates = async (rawRuns, scheduleId) => {
  let changed = false;
  await Promise.all(rawRuns.map(async (run) => {
    let duration = run._horaroEstimate * 1000;
    let estimate = TimeUtils.parseTimeString(run.estimate);
    let setupTime = TimeUtils.parseTimeString(run.setupTime);
    if (duration != estimate + setupTime) {
      await HoraroUtils.updateRunEstimate({
        scheduleId,
        runId: run.id,
        estimate: Math.floor((estimate + setupTime) / 1000),
        csrfName,
        csrfToken,
      });
      changed = true;
      nodecg.log.info(
        `Updated Run Id ${run.id} (${run.name}) for not having matching `
        + `estimate/setup/duration`);
    }
  }));
  return !changed;
};

const updateStartTime = async () => {
  const run = currentRunRep.value;
  const prevRun = [...scheduleRep.value].reverse().find((item) => {
    if (item.type !== 'run') {
      return false;
    }

    return item.order < run.order;
  });

  const now = Date.now();
  let oldTimeTracking = clone(timeTracking.value);
  timeTracking.value.startTime.last = now;
  if (timeTracking.value.startTime.first == null) {
    timeTracking.value.startTime.first = now;
  }
  if (timeTracking.value.finishTime.first == null) {
    timeTracking.value.startTime.firstCompleted = now;
  }

  if (!updateHoraro.value) {
    return;
  }

  const scheduleMode = getScheduleModeFromRun(run);
  if (scheduleMode == SCHEDULE_MODE.CUSTOM) {
    return;
  }
  if (scheduleMode == SCHEDULE_MODE.NORMAL) {
    if (oldTimeTracking.finishTime.first) {
      return;
    }
  }
  if (scheduleMode == SCHEDULE_MODE.MULTI_PARTS) {
    if (oldTimeTracking.startTime.firstCompleted) {
      return;
    }
  }

  // This is the case of the first game of the marathon. In this case, I'll let
  // the next game eat the additional setup time for this game to get started
  if (typeof prevRun === 'undefined') {
    if (run.order != 0) {
      throw new Error(
        `Run ${run.id} (${run.name}) does not have a previous run `
        + `and is not the first run`);
    }
    return;
  }

  let runStartTime = new Date(scheduleProperties.value.startTime);
  scheduleRep.value.forEach((item) => {
    if (item.order < run.order) {
      runStartTime.setSeconds(runStartTime.getSeconds() + item._horaroEstimate);
    }
  });
  let offset = Math.floor((now - runStartTime.getTime()) / 1000);
  let prevSetupTime = TimeUtils.parseTimeString(prevRun.setupTime) / 1000;
  const {id: scheduleId, setupTime} = nodecg.bundleConfig.tracker.schedule;
  let horaroEstimate = prevRun._horaroEstimate + offset;
  let formattedSetupTime = TimeUtils.formatSeconds(
    prevSetupTime + offset, {showHours: true});
  if (horaroEstimate < 0) {
    throw new Error(
      `Run ${prevRun.id} (${prevRun.name}) cannot have negative Horaro `
      + `estimate of ${horaroEstimate}`);
  }
  await HoraroUtils.updateRunEstimateAndData({
    scheduleId,
    runId: prevRun.id,
    estimate: horaroEstimate,
    data: {
      [setupTime]: formattedSetupTime,
    },
    csrfName,
    csrfToken,
  });
  events.emit('horaro-updated');
};

const updateFinishTime = async () => {
  if (!checklistComplete.value) {
    return;
  }
  if (stopwatch.value.state !== STOPWATCH_STATES.FINISHED) {
    return;
  }

  const run = currentRunRep.value;

  const now = Date.now();
  let oldTimeTracking = clone(timeTracking.value);
  let bestFinishTime;
  stopwatch.value.results.forEach((result) => {
    if (result && !result.forfeit) {
      if (!bestFinishTime || result.time.raw < bestFinishTime) {
        bestFinishTime = result.time.raw;
      }
    }
  });
  if (!bestFinishTime) {
    // No best completed time, look for worst forfeit time
    stopwatch.value.results.forEach((result) => {
      if (result && result.forfeit) {
        if (!bestFinishTime || result.time.raw > bestFinishTime) {
          bestFinishTime = result.time.raw;
        }
      }
    });
  }
  timeTracking.value.finishTime.last = now;
  timeTracking.value.finishTime.lastDuration = bestFinishTime;
  if (timeTracking.value.finishTime.first == null) {
    timeTracking.value.finishTime.first = now;
    timeTracking.value.finishTime.firstDuration = bestFinishTime;
  }
};


const updateFinalFinishTime = async () => {
  const run = currentRunRep.value;

  if (!updateHoraro.value) {
    return;
  }

  let runRunTime;
  const scheduleMode = getScheduleModeFromRun(run);
  if (scheduleMode == SCHEDULE_MODE.NORMAL) {
    if (!timeTracking.value.finishTime.firstDuration) {
      return;
    }
    runRunTime = Math.floor(timeTracking.value.finishTime.firstDuration / 1000);
  } else if (scheduleMode == SCHEDULE_MODE.MULTI_PARTS) {
    if (!timeTracking.value.finishTime.last) {
      return;
    }
    if (!timeTracking.value.startTime.firstCompleted) {
      return;
    }

    let timeDiff =
      timeTracking.value.finishTime.last
      - timeTracking.value.startTime.firstCompleted;
    let runRunTime = Math.floor(timeDiff / 1000);
  } else {
    return;
  }

  let setupTime = TimeUtils.parseTimeString(run.setupTime) / 1000;
  const {id: scheduleId, runTime} = nodecg.bundleConfig.tracker.schedule;
  let horaroEstimate = runRunTime + setupTime;
  let formattedRunTime = TimeUtils.formatSeconds(runRunTime, {showHours: true});
  if (horaroEstimate < 0) {
    throw new Error(
      `Run ${run.id} (${run.name}) cannot have negative Horaro `
      + `estimate of ${horaroEstimate}`);
  }
  await HoraroUtils.updateRunEstimateAndData({
    scheduleId,
    runId: run.id,
    estimate: runRunTime + setupTime,
    data: {
      [runTime]: formattedRunTime,
    },
    csrfName,
    csrfToken,
  });
  events.emit('horaro-updated');
};

const runChanging = async () => {
  await updateFinalFinishTime();

  timeTracking.value = {
    startTime: {
      first: null,
      firstCompleted: null,
      last: null,
    },
    finishTime: {
      first: null,
      firstDuration: null,
      last: null,
      lastDuration: null,
    },
  };
};

module.exports = {
  on: events.on.bind(events),
  getSchedule,
  validatedEstimates,
  updateStartTime,
  updateFinishTime,
  runChanging,
  STOPWATCH_STATES,
};
