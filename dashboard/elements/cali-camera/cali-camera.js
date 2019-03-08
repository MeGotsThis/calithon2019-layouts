(function() {
  'use strict';

  const camera = nodecg.Replicant('break-cam');

  class CaliCamera extends Polymer.Element {
    static get is() {
      return 'cali-camera';
    }

    static get properties() {
      return {};
    }

    ready() {
      super.ready();
      camera.on('change', (newVal) => {
        this.$.camera.checked = newVal;
      });
    }

    _handleUpdateToggleChange(e) {
      camera.value = e.target.checked;
    }
  }

  customElements.define(CaliCamera.is, CaliCamera);
})();
