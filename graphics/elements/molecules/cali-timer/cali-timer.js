(function() {
  'use strict';

  const stopwatch = nodecg.Replicant('stopwatch');

  class CaliTimer extends Polymer.Element {
    static get is() {
      return 'cali-timer';
    }

    static get properties() {
      return {
        paused: {
          type: Boolean,
          observer: 'pausedChanged',
          reflectToAttribute: true,
        },
        finished: {
          type: Boolean,
          observer: 'finishedChanged',
          reflectToAttribute: true,
        },
        forfeit: {
          type: Boolean,
          reflectToAttribute: true,
        },
      };
    }

    pausedChanged(newVal) {
      if (newVal && this.finished) {
        this.finished = false;
      }
    }

    finishedChanged(newVal) {
      if (newVal && this.paused) {
        this.paused = false;
      }
    }

    ready() {
      super.ready();

      const timerTL = new TimelineLite({autoRemoveChildren: true});

      stopwatch.on('change', (newVal, oldVal) => {
        this.time = newVal.time.formatted;

        if (oldVal) {
          if (newVal.state === 'running' && oldVal.state !== 'running') {
            timerTL.from(this.$.startFlash, 1, {
              opacity: 1,
              ease: Power2.easeIn,
            });
          } else if (newVal.state !== 'running'
              && newVal.state !== oldVal.state) {
            timerTL.clear();
            this.$.startFlash.style.opacity = 0;
          }
        }

        this.notStarted = newVal.state === 'not_started';
        this.paused = newVal.state === 'paused';
        this.finished = newVal.state === 'finished';
        this.forfeit = newVal.results.every((r) => r == null || r.forfeit);
      });
    }
  }

  customElements.define(CaliTimer.is, CaliTimer);
})();
