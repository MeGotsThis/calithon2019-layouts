(function() {
  'use strict';

  const cashTotal = nodecg.Replicant('total');

  class CaliHostdashTotals extends Polymer.Element {
    static get is() {
      return 'dash-host-totals';
    }

    static get properties() {
      return {
        cashTotal: {
          type: String,
        },
        bitsTotal: {
          type: String,
        },
      };
    }

    connectedCallback() {
      super.connectedCallback();
      cashTotal.on('change', (newVal) => {
        this.cashTotal = newVal.formatted;
      });
    }
  }

  customElements.define(CaliHostdashTotals.is, CaliHostdashTotals);
})();
