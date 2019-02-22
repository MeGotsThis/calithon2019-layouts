(function() {
  'use strict';

  const currentRun = nodecg.Replicant('currentRun');

  class CaliCategory extends Polymer.Element {
    static get is() {
      return 'cali-category';
    }

    static get properties() {
      return {
        right: {
          type: Boolean,
          reflectToAttribute: true,
        },
      };
    }

    ready() {
      super.ready();
      currentRun.on('change', this.currentRunChanged.bind(this));
    }

    currentRunChanged(newVal) {
      this.category = newVal.category;

      if (this.initialized || !Polymer.RenderStatus) {
        this.fitText();
      } else {
        Polymer.RenderStatus.afterNextRender(this, this.fitText);
        this.initialized = true;
      }
    }

    fitText() {
      if (Polymer.flush) {
        Polymer.flush();
      }

      const MAX_CATEGORY_WIDTH = this.clientWidth;
      const categorySpan = this.$.text;
      const categoryWidth = categorySpan.clientWidth;
      if (categoryWidth > MAX_CATEGORY_WIDTH) {
        TweenLite.set(categorySpan, {
          scaleX: MAX_CATEGORY_WIDTH / categoryWidth,
          transformOrigin: this.right ? 'right' : 'left',
        });
      } else {
        TweenLite.set(categorySpan, {
          scaleX: 1,
          transformOrigin: this.right ? 'right' : 'left',
        });
      }
    }
  }

  customElements.define(CaliCategory.is, CaliCategory);
})();
