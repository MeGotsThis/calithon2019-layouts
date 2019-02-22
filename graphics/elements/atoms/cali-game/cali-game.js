(function() {
  'use strict';

  const currentRun = nodecg.Replicant('currentRun');

  class CaliGame extends Polymer.Element {
    static get is() {
      return 'cali-game';
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
      currentRun.on('change', this.currentRunChanged.bind(this));
    }

    currentRunChanged(newVal) {
      let newLineReplace = this.singleLineName ? ' ' : '<br/>';
      this.name = (newVal.name || '').replace('\\n', newLineReplace);

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

      const gameSpan = this.$.text;
      const MAX_GAME_WIDTH = gameSpan.clientWidth;
      const gameWidth = gameSpan.scrollWidth;
      if (gameWidth > MAX_GAME_WIDTH) {
        TweenLite.set(gameSpan, {
          scaleX: MAX_GAME_WIDTH / gameWidth,
          transformOrigin: 'left',
      });
      } else {
        TweenLite.set(gameSpan, {
          scaleX: 1,
          transformOrigin: 'left',
      });
      }
    }
  }

  customElements.define(CaliGame.is, CaliGame);
})();
