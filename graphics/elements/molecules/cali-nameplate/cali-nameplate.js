(function() {
  'use strict';

  const NAME_FADE_DURATION = 0.33;
  const NAME_FADE_IN_EASE = Power1.easeOut;
  const NAME_FADE_OUT_EASE = Power1.easeIn;
  const currentRun = nodecg.Replicant('currentRun');
  const gameAudioChannels = nodecg.Replicant('gameAudioChannels');

  class CaliNameplate extends Polymer.Element {
    static get is() {
      return 'cali-nameplate';
    }

    static get properties() {
      return {
        index: Number,
        coop: {
          type: Boolean,
          reflectToAttribute: true,
        },
        name: {
          type: String,
          value: '',
        },
        twitch: {
          type: String,
          value: '',
        },
        audio: {
          type: Boolean,
          reflectToAttribute: true,
          value: false
        },
        noAudio: {
          type: Boolean,
          reflectToAttribute: true,
          value: false
        },
        audioClassName: {
          computed: 'computeAudioClass(audio)',
        },
      };
    }

    ready() {
      super.ready();

      // Create looping anim for main nameplate.
      this.nameTL = new TimelineMax({repeat: -1, paused: true});
      this.nameTL.to(this.$.names, NAME_FADE_DURATION, {
        onStart: function() {
          this.$.namesTwitch.classList.remove('hidden');
          this.$.namesName.classList.add('hidden');
        }.bind(this),
        opacity: 1,
        ease: NAME_FADE_IN_EASE,
      });
      this.nameTL.to(this.$.names, NAME_FADE_DURATION, {
        opacity: 0,
        ease: NAME_FADE_OUT_EASE,
      }, '+=10');
      this.nameTL.to(this.$.names, NAME_FADE_DURATION, {
        onStart: function() {
          this.$.namesTwitch.classList.add('hidden');
          this.$.namesName.classList.remove('hidden');
        }.bind(this),
        opacity: 1,
        ease: NAME_FADE_IN_EASE,
      });
      this.nameTL.to(this.$.names, NAME_FADE_DURATION, {
        opacity: 0,
        ease: NAME_FADE_OUT_EASE,
      }, '+=80');

      // Attach replicant change listeners.
      currentRun.on('change', this.currentRunChanged.bind(this));
      gameAudioChannels.on('change', this.gameAudioChannelsChanged);
    }

    /*
     * 1) For singleplayer, if both match (ignoring capitalization), show only
     *   twitch.
     * 2) For races, if everyone matches (ignoring capitalization), show only
     *    twitch, otherwise, if even one person needs to show both, everyone
     *    shows both.
     */
    currentRunChanged(newVal, oldVal) {
      // If nothing has changed, do nothing.
      if (oldVal) {
        let newJson = JSON.stringify(newVal.runners);
        let oldJson = JSON.stringify(oldVal.runners);
        if (newJson === oldJson) {
          return;
        }
      }

      this.coop = newVal.coop;

      let canConflateAllRunners = true;
      const runners = newVal.runners || [];
      runners.forEach((runner) => {
        if (runner) {
          if (!runner.stream
                || runner.name.toLowerCase() !== runner.stream.toLowerCase()) {
            canConflateAllRunners = false;
          }
        }
      });

      TweenLite.to(this.$.names, NAME_FADE_DURATION, {
        opacity: 0,
        ease: NAME_FADE_OUT_EASE,
        onComplete: function() {
          this.$.namesName.classList.add('hidden');
          this.$.namesTwitch.classList.remove('hidden');

          const runner = runners[this.index];
          if (runner) {
            this.name = runner.name;

            if (runner.stream) {
              this.twitch = runner.stream;
            } else {
              this.twitch = '';
            }
          } else {
            this.name = '?';
            this.twitch = '?';
          }

          if (!this.twitch) {
            this.nameTL.pause();
            this.$.namesName.classList.remove('hidden');
            this.$.namesTwitch.classList.add('hidden');
            TweenLite.to(this.$.names, NAME_FADE_DURATION, {
              opacity: 1,
              ease: NAME_FADE_IN_EASE,
            });
          } else if (canConflateAllRunners) {
            this.nameTL.pause();
            TweenLite.to(this.$.names, NAME_FADE_DURATION, {
              opacity: 1,
              ease: NAME_FADE_IN_EASE,
            });
          } else {
            this.nameTL.restart();
          }

          Polymer.RenderStatus.afterNextRender(this, this.fitName);
        }.bind(this),
      });
    }

    fitName() {
      Polymer.flush();
      const MAX_NAME_WIDTH = this.$.name.clientWidth;
      const nameWidth = this.$.name.scrollWidth;
      if (nameWidth > MAX_NAME_WIDTH) {
        TweenLite.set(this.$.name, {
          scaleX: MAX_NAME_WIDTH / nameWidth,
          transformOrigin: this.right ? 'right' : 'left',
        });
      } else {
        TweenLite.set(this.$.name, {
          scaleX: 1,
          transformOrigin: this.right ? 'right' : 'left',
        });
      }

      const MAX_TWITCH_WIDTH = this.$.twitch.clientWidth;
      const twitchWidth = this.$.twitch.scrollWidth;
      if (twitchWidth > MAX_TWITCH_WIDTH) {
        const scale = MAX_TWITCH_WIDTH / twitchWidth;
        const newWidth = twitchWidth * scale;

        // Can sometimes be NaN on the co-op variants of Standard_1
        if (typeof newWidth === 'number' && !isNaN(newWidth)) {
          TweenLite.set(this.$.twitch, {
            scaleX: scale,
            width: newWidth,
          });
        }
      } else {
        TweenLite.set(this.$.twitch, {scaleX: 1});
      }
    }

    gameAudioChannelsChanged(newVal) {
      if (this.noAudio) {
        return;
      }

      if (!newVal || newVal.length <= 0) {
        return;
      }

      const channels = newVal[this.index];
      const canHearSd = !channels.sd.muted && !channels.sd.fadedBelowThreshold;
      const canHearHd = !channels.hd.muted && !channels.hd.fadedBelowThreshold;
      this.audio = canHearSd || canHearHd;
    }

    computeAudioClass(audio) {
      if (!audio) {
        return "hidden";
      }
      return "";
    }
  }

  customElements.define(CaliNameplate.is, CaliNameplate);
})();
