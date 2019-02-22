(function() {
  'use strict';

  const FADE_DURATION = 0.33;
  const FADE_IN_EASE = Power1.easeOut;
  const FADE_OUT_EASE = Power1.easeIn;
  const currentRun = nodecg.Replicant('currentRun');
  const stopwatch = nodecg.Replicant('stopwatch');

  class CaliFinishTime extends Polymer.Element {
    static get is() {
      return 'cali-finish-time';
    }

    static get properties() {
      return {
        index: Number,
        attach: {
          type: String,
          description:
            'This is the location where the element is attaching from',
          reflectToAttribute: true,
        },
        forfeit: {
          type: Boolean,
          readOnly: true,
          reflectToAttribute: true,
          value: false,
        },
        time: {
          type: String,
          readOnly: true,
        },
        place: {
          type: Number,
          readOnly: true,
        },
        coop: {
          type: Boolean,
          readOnly: true,
        },
        placement: {
          type: String,
          computed: 'calcPlacement(place, forfeit)',
        },
        timeTL: {
          type: TimelineLite,
          value() {
            return new TimelineLite({autoRemoveChildren: true});
          },
          readOnly: true,
        },
      };
    }

    static get observers() {
      return [
        'handleNewPlace(place, forfeit, coop)',
      ];
    }

    handleNewPlace(place, forfeit, coop) {
      if ((place || forfeit) && !coop) {
        this.showTime();
      } else {
        this.hideTime();
      }
    }

    showTime() {
      if (this._timeShowing) {
        return;
      }

      this._timeShowing = true;

      this.timeTL.clear();
      let val = {
        ease: FADE_OUT_EASE,
        clearProps: 'all',
      };
      if (this.attach === 'top') {
        val.top = 0;
      } else if (this.attach === 'bottom') {
        val.top = 0;
      } else if (this.attach === 'left') {
        val.left = 0;
      } else if (this.attach === 'right') {
        val.left = 0;
      }
      this.timeTL.to(this.$.main, FADE_DURATION, val);
    }

    hideTime() {
      if (!this._timeShowing) {
        return;
      }

      this._timeShowing = false;

      this.timeTL.clear();
      let val = {
        ease: FADE_IN_EASE,
      };
      if (this.attach === 'top') {
        val.top = '-100%';
      } else if (this.attach === 'bottom') {
        val.top = '100%';
      } else if (this.attach === 'left') {
        val.left = '-100%';
      } else if (this.attach === 'right') {
        val.left = '100%';
      }
      this.timeTL.to(this.$.main, FADE_DURATION, val);
    }

    calcPlacement(place, forfeit) {
      if (forfeit) {
        return 'Forfeit';
      }

      switch (place) {
        case 1:
          return '1st';
        case 2:
          return '2nd';
        case 3:
          return '3rd';
        case 4:
          return '4th';
        default:
          return '';
      }
    }

    ready() {
      super.ready();
      this._timeShowing = true;

      stopwatch.on('change', this.stopwatchChanged.bind(this));
      currentRun.on('change', this.currentRunChanged.bind(this));
    }

    stopwatchChanged(value) {
      if (value.results[this.index]) {
        this._setForfeit(value.results[this.index].forfeit);
        this._setPlace(value.results[this.index].place);
        this._setTime(value.results[this.index].time.formatted);
      } else {
        this._setForfeit(false);
        this._setPlace(0);
      }
    }

    currentRunChanged(value) {
      this._setCoop(value.coop);
    }
  }

  customElements.define(CaliFinishTime.is, CaliFinishTime);
})();
