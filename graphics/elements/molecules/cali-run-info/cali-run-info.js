(function() {
  'use strict';

  class CaliRunInfo extends Polymer.Element {
    static get is() {
      return 'cali-run-info';
    }

    static get properties() {
      return {
        singleLineName: {
          type: Boolean,
          reflectToAttribute: true,
          value: false,
        },
      };
    }
  }

  customElements.define(CaliRunInfo.is, CaliRunInfo);
})();
