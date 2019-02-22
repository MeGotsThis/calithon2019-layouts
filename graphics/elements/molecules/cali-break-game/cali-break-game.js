(function() {
  'use strict';

  const currentRun = nodecg.Replicant('currentRun');
  const nextRun = nodecg.Replicant('nextRun');
  const schedule = nodecg.Replicant('schedule');
  const stopwatch = nodecg.Replicant('stopwatch');

  class CaliBreakGame extends Polymer.Element {
    static get is() {
      return 'cali-break-game';
    }

    static get properties() {
      return {
        offset: {
          type: Number,
          value: 0,
        },
        prefix: {
          type: String,
        },
      };
    }

    ready() {
      super.ready();
      currentRun.on('change', this.runChanged.bind(this));
      nextRun.on('change', this.runChanged.bind(this));
      schedule.on('change', this.runChanged.bind(this));
      stopwatch.on('change', this.runChanged.bind(this));
    }

    runChanged() {
      if (currentRun.status !== 'declared'
          || nextRun.status !== 'declared'
          || schedule.status !== 'declared'
          || stopwatch.status !== 'declared') {
        return;
      }

      let newLineReplace = this.singleLineName ? ' ' : '<br/>';
      let baseGame;
      if (stopwatch.value.state === 'finished') {
        baseGame = nextRun.value;
      } else {
        baseGame = currentRun.value;
      }
      let game = baseGame;
      if (this.offset > 0) {
        let runs = schedule.value.filter(
          (item) => item.type === 'run' && item.order >= baseGame.order);
        game = runs[this.offset];
      } else if (this.offset < 0) {
        let runs = schedule.value.filter(
          (item) => item.type === 'run' && item.order <= baseGame.order);
        game = runs.reverse()[-this.offset];
      }
      if (!game) {
        this.hidden = true;
        return;
      }
      this.hidden = false;
      this.game = (game.name || '').replace('\\n', newLineReplace);
      this.category = game.category;
      if (game.runners.length) {
        this.runners = game.runners.map((r) => r.name || r.twitch).join(', ');
      } else {
        this.runners = '?';
      }

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

      const gameSpan = this.$.game;
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

  customElements.define(CaliBreakGame.is, CaliBreakGame);
})();
