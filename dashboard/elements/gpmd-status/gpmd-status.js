(function() {
  'use strict';

  const gpmdConnected = nodecg.Replicant('gpmd-connected');
  const gpmd = nodecg.Replicant('gpmd');
  const gpmdAuthorizationCode = nodecg.Replicant('gpmd-authorization-code');

  class GooglePlayMusicDesktopStatus extends Polymer.Element {
    static get is() {
      return 'gpmd-status';
    }

    static get properties() {
      return {};
    }

    ready() {
      super.ready();
      gpmdConnected.on('change', (value) => {
        this.connected = value ? 'Connected' : 'Not Connected';
        this.connectedColor = value ? 'green' : 'red';
        this.connectedWeight = value ? 'normal' : 'bold';
      });
      gpmd.on('change', (value) => {
      });
      gpmdAuthorizationCode.on('change', (value) => {
        this.authorizationCodeNeeded = value == null;
      });
    }

    sendCode() {
      nodecg.sendMessage('gpmd:authorization', this.$.authorizationCode.value);
    }
  }

  customElements.define(
    GooglePlayMusicDesktopStatus.is, GooglePlayMusicDesktopStatus);
})();
