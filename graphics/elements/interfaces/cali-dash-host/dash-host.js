(function() {
  'use strict';

  const METROID_BID_ID = 5744;
  const allBids = nodecg.Replicant('allBids');
  const checklistComplete = nodecg.Replicant('checklistComplete');
  const stopwatch = nodecg.Replicant('stopwatch');
  const currentRun = nodecg.Replicant('currentRun');
  const scheduleProperties = nodecg.Replicant('scheduleProperties');

  class CaliHostDashboard extends Polymer.MutableData(Polymer.Element) {
    static get is() {
      return 'dash-host';
    }

    static get properties() {
      return {
        currentTime: {
          type: String,
        },
        currentRun: {
          type: Object,
        },
        elapsedTime: {
          type: String,
        },
        bidFilterString: {
          type: String,
          value: '',
        },
      };
    }

    connectedCallback() {
      super.connectedCallback();

      this.updateCurrentTime = this.updateCurrentTime.bind(this);
      this.updateCurrentTime();
      setInterval(this.updateCurrentTime, 1000);

      this.updateTimeElapsed = this.updateTimeElapsed.bind(this);
      this.updateTimeElapsed();
      setInterval(this.updateTimeElapsed, 1000);

      allBids.on('change', (newVal) => {
        const metroidBid = newVal.find((bid) => bid.id === METROID_BID_ID);
        this.metroidBid = metroidBid ? metroidBid : null;
      });

      checklistComplete.on('change', (newVal) => {
        if (newVal) {
          this.$.checklistStatus.style.backgroundColor = '#cfffcf';
          this.$.checklistStatus.innerText = 'READY TO START';
        } else {
          this.$.checklistStatus.style.backgroundColor = '#ffe2e2';
          this.$.checklistStatus.innerText = 'NOT READY YET';
        }
      });

      currentRun.on('change', (newVal) => {
        this.$['currentRun-name'].innerHTML =
          newVal.name.replace('\\n', '<br/>').trim();
        this.runners = newVal.runners;
      });

      stopwatch.on('change', (newVal) => {
        this.stopwatchState = newVal.state;
        this.stopwatchTime = newVal.time.formatted;
        this.stopwatchResults = newVal.results;
      });
    }

    calcRunnersString(runners) {
      let concatenatedRunners;
      if (runners.length === 1) {
        concatenatedRunners = runners[0].name;
      } else {
        concatenatedRunners =
          runners.slice(1).reduce((prev, curr, index, array) => {
            if (index === array.length - 1) {
              return `${prev} & ${curr.name}`;
            }

            return `${prev}, ${curr.name}`;
          }, runners[0].name);
      }
      return concatenatedRunners;
    }

    updateCurrentTime() {
      const date = new Date();
      this.currentTime = date.toLocaleTimeString('en-US', {hour12: true});
    }

    updateTimeElapsed() {
      if (scheduleProperties.status !== 'declared') {
        return;
      }

      const nowTimestamp = Date.now();
      let millisecondsElapsed =
        nowTimestamp - scheduleProperties.value.startTime;
      let eventHasStarted = true;
      if (millisecondsElapsed < 0) {
        eventHasStarted = false;
        millisecondsElapsed = Math.abs(millisecondsElapsed);
      }

      const days = millisecondsElapsed / 8.64e7 | 0;
      const hours = parseInt((millisecondsElapsed / (1000 * 60 * 60)) % 24, 10);
      const minutes = parseInt((millisecondsElapsed / (1000 * 60)) % 60, 10);
      let timeString;

      if (eventHasStarted) {
        if (hours > 0) {
          timeString = `${(days * 24) + hours} HOURS`;
        } else {
          timeString = `${minutes} MINUTES`;
        }

        timeString += ' ELAPSED';
      } else {
        timeString = 'SHOW STARTS IN ';
        if (days > 0) {
          timeString += `${days} DAYS, ${hours} HOURS & ${minutes} MINUTES`;
        } else if (hours > 0) {
          timeString += `${hours} HOURS & ${minutes} MINUTES`;
        } else {
          timeString += `${minutes} MINUTES`;
        }
      }

      this.elapsedTime = timeString;
    }

    calcRunnerName(runners, index) {
      if (!runners) {
        return;
      }

      if (index > runners.length - 1) {
        return '';
      }

      return runners[index].name;
    }

    isValidResult(result, index, runners, currentRun) {
      return result && result !== null
        && runners[index] && runners[index].name
        && currentRun && !currentRun.coop;
    }
  }

  customElements.define(CaliHostDashboard.is, CaliHostDashboard);
})();
