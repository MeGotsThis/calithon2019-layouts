class CaliHostDashboardPrize extends Polymer.MutableData(Polymer.Element) {
  static get is() {
    return 'dash-host-prize';
  }

  static get properties() {
    return {
      prize: {
        type: Object,
      },
    };
  }
}

customElements.define(CaliHostDashboardPrize.is, CaliHostDashboardPrize);
