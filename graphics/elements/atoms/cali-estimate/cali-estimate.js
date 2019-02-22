(function() {
  'use strict';

  const currentRun = nodecg.Replicant('currentRun');

  class CaliEstimate extends Polymer.Element {
    static get is() {
      return 'cali-estimate';
    }

    static get properties() {
      return {
      };
    }

    ready() {
      super.ready();
      currentRun.on('change', this.currentRunChanged.bind(this));
    }

    currentRunChanged(newVal) {
      this.estimate = newVal.estimate;
    }
  }

  customElements.define(CaliEstimate.is, CaliEstimate);
})();
