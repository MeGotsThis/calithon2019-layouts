(function() {
  const recentDonations = nodecg.Replicant('recentDonations');
  const readDonations = nodecg.Replicant('readDonations');
  readDonations.setMaxListeners(nodecg.bundleConfig.donation.recent + 2);

  class CaliHostDashboardDonations
      extends Polymer.MutableData(Polymer.Element) {
    static get is() {
      return 'dash-host-donations';
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
      recentDonations.on('change', (newVal) => {
        this.donations = newVal;
      });
    }

    markAllUnread() {
      if (readDonations.status !== 'declared') {
        return;
      }

      readDonations.value = [];
    }

    markAllRead() {
      if (readDonations.status !== 'declared') {
        return;
      }

      readDonations.value = this.donations.map((donation) => donation.id);
    }
  }

  customElements.define(CaliHostDashboardDonations.is,
    CaliHostDashboardDonations);
})();
