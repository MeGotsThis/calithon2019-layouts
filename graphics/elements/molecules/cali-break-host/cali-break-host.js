(function() {
  'use strict';

  const currentHost = nodecg.Replicant('currentHost');

  class CaliBreakHost extends Polymer.Element {
    static get is() {
      return 'cali-break-host';
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

    ready() {
      super.ready();
      currentHost.on('change', (newVal) => {
        this.currentHost = newVal;

        if (this.initialized || !Polymer.RenderStatus) {
          this.fitText();
        } else {
          Polymer.RenderStatus.afterNextRender(this, this.fitText);
          this.initialized = true;
        }
      });
    }

    fitText() {
      if (Polymer.flush) {
        Polymer.flush();
      }

      const textSpan = this.$.text;
      const MAX_TEXT_WIDTH = textSpan.clientWidth;
      const textWidth = textSpan.scrollWidth;
      if (textWidth > MAX_TEXT_WIDTH) {
        TweenLite.set(textSpan, {
          scaleX: MAX_TEXT_WIDTH / textWidth,
          transformOrigin: 'left',
      });
      } else {
        TweenLite.set(textSpan, {
          scaleX: 1,
          transformOrigin: 'left',
      });
      }
    }
  }

  customElements.define(CaliBreakHost.is, CaliBreakHost);
})();
