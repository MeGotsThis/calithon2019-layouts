(function() {
  'use strict';

  const updateHoraro = nodecg.Replicant('updateHoraro');
  const timeTracking = nodecg.Replicant('timeTracking');
  const schedule = nodecg.Replicant('schedule');
  const scheduleProperties = nodecg.Replicant('scheduleProperties');
  const currentRun = nodecg.Replicant('currentRun');

  class CaliHoraro extends Polymer.Element {
    static get is() {
      return 'cali-horaro';
    }

    static get properties() {
      return {};
    }

    ready() {
      super.ready();
      updateHoraro.on('change', (newVal) => {
        this.$.horaroUpdate.checked = newVal;
      });
      timeTracking.on('change', this._updateDisables.bind(this));
      schedule.on('change', this._updateDisables.bind(this));
      scheduleProperties.on('change', this._updateDisables.bind(this));
      currentRun.on('change', this._updateDisables.bind(this));
      this._updateDisables();
    }

    _handleUpdateToggleChange(e) {
      updateHoraro.value = e.target.checked;
    }

    _updateStartTime() {
      const runStartTime = new Date(scheduleProperties.value.startTime);
      schedule.value.forEach((item) => {
        if (item.order < currentRun.value.order) {
          runStartTime.setSeconds(
            runStartTime.getSeconds() + item._horaroEstimate);
        }
      });
      let startTime =
        `${runStartTime.getHours().toString().padStart(2, '0')}:`
        + `${runStartTime.getMinutes().toString().padStart(2, '0')}:`
        + `${runStartTime.getSeconds().toString().padStart(2, '0')}`;
      this.$.startTimeValue.value = startTime;
      this.$.startTimeDialog.open();
    }

    _updateRunTime() {
      const run = currentRun.value;
      const prevRun = [...schedule.value].reverse().find((item) => {
        if (item.type !== 'run') {
          return false;
        }

        return item.order < run.order;
      });

      this.$.runTimeValue.value = prevRun.estimate;
      this.$.runTimeDialog.open();
    }

    _updateDisables() {
      if (timeTracking.status !== 'declared'
            || schedule.status !== 'declared'
            || scheduleProperties.status !== 'declared'
            || currentRun.status !== 'declared') {
        this.startTimeDisabled = true;
        this.runTimeDisabled = true;
        return;
      }

      this.startTimeDisabled = false;
      if (currentRun.value.order === 0) {
        this.startTimeDisabled = true;
      }
      if (!timeTracking.value.startTime.first) {
        this.startTimeDisabled = true;
      }

      this.runTimeDisabled = false;
      if (timeTracking.value.startTime.first) {
        this.runTimeDisabled = true;
      }
    }

    _handleStartTimeDialogConfirmed() {
      let now = new Date();
      let timeParts = this.$.startTimeValue.value.split(':');

      let hours;
      let minutes;
      let seconds = 0;
      let dayOffset = 0;
      if (timeParts.length == 2) {
        hours = parseInt(timeParts[0]);
        minutes = parseInt(timeParts[1]);
      } else if (timeParts.length == 3) {
        hours = parseInt(timeParts[0]);
        minutes = parseInt(timeParts[1]);
        seconds = parseInt(timeParts[2]);
      } else {
        throw new Error('Invalid Time Format');
      }

      let timeOfDay = hours * 3600 + minutes * 60 + seconds;
      let nowTimeOfDay = now.getHours() * 3600 + now.getMinutes() * 60
        + now.getSeconds();
      let timeDiff = Math.abs(timeOfDay - nowTimeOfDay);
      let timeOtherDiff = Math.abs(86400 - timeDiff);
      if (timeDiff > timeOtherDiff) {
        if (nowTimeOfDay > timeOfDay) {
          dayOffset = 1;
        } else {
          dayOffset = -1;
        }
      }

      now.setDate(now.getDate() + dayOffset);
      now.setHours(hours);
      now.setMinutes(minutes);
      now.setSeconds(seconds);

      nodecg.sendMessage('setStartTime', {
        value: now.getTime(),
      });
    }

    _handleRunTimeDialogConfirmed() {
      let now = new Date();
      let timeParts = this.$.runTimeValue.value.split(':');

      let hours;
      let minutes;
      let seconds = 0;
      if (timeParts.length == 3) {
        hours = parseInt(timeParts[0]);
        minutes = parseInt(timeParts[1]);
        seconds = parseInt(timeParts[2]);
      } else {
        throw new Error('Invalid Time Format');
      }

      let duration = (hours * 3600 + minutes * 60 + seconds) * 1000;

      nodecg.sendMessage('setRunTime', {
        value: duration,
      });
    }
  }

  customElements.define(CaliHoraro.is, CaliHoraro);
})();
