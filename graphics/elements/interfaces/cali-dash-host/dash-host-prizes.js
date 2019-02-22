(function() {
  const currentPrizes = nodecg.Replicant('currentPrizes');

  class CaliHostDashboardPrizes extends Polymer.MutableData(Polymer.Element) {
    static get is() {
      return 'dash-host-prizes';
    }

    static get properties() {
      return {
        prizes: {
          type: Array,
        },
      };
    }

    ready() {
      super.ready();
      currentPrizes.on('change', (newVal) => {
        this.prizes = newVal;
      });
    }
  }

  customElements.define(CaliHostDashboardPrizes.is, CaliHostDashboardPrizes);
})();
