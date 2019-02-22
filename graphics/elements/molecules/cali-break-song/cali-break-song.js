(function() {
  'use strict';

  const NP_FADE_DURATION = 0.334;
  const gpmd = nodecg.Replicant('gpmd');

  class CaliBreakSong extends Polymer.Element {
    static get is() {
      return 'cali-break-song';
    }

    static get properties() {
      return {
        nowPlayingTL: {
          type: TimelineLite,
          value() {
            return new TimelineLite({autoRemoveChildren: true});
          },
          readOnly: true,
        },
      };
    }

    ready() {
      super.ready();
      gpmd.on('change', this._gpmdChanged.bind(this));
    }

    _gpmdChanged(newVal, oldVal) {
      if (typeof newVal === 'undefined') {
        return;
      }
      if (typeof oldVal !== 'undefined'
          && newVal.track.title === oldVal.track.title
          && newVal.track.album === oldVal.track.album) {
        return;
      }
      const nowPlayingTL = this.nowPlayingTL;

      nowPlayingTL.to(this.$['nowplaying-outer'], NP_FADE_DURATION, {
        opacity: 0,
        ease: Power1.easeIn,
        onComplete() {
          TweenMax.killTweensOf(this.$['nowplaying-text']);
          TweenLite.set([
            this.$['nowplaying-text'],
          ], {x: 0});

          [{
            element: this.$['nowplaying-text'],
            scrollMultiplier: 1.2,
            newContent: `${newVal.track.title} - ${newVal.track.album}`,
          }].forEach(({element, scrollMultiplier, newContent}) => {
            element.innerHTML = newContent || '?';
            if (element.scrollWidth > element.clientWidth) {
              element.innerHTML =
                `<div class="scroller">${newContent}`
                + `&nbsp;&nbsp;&nbsp;&nbsp;</div>`
                + `<div class="scroller">${newContent}`
                + `&nbsp;&nbsp;&nbsp;&nbsp;</div>`;
              Polymer.flush();
              setTimeout(() => {
                const scrollerWidth =
                  element.querySelector('.scroller').scrollWidth;
                const duration = scrollerWidth * scrollMultiplier;
                TweenMax.to(element, duration, {
                  ease: Linear.easeNone,
                  x: -scrollerWidth,
                  useFrames: true,
                  repeat: -1,
                });
              }, 10);
            }
          });
        },
        onCompleteScope: this,
      });

      nowPlayingTL.to(this.$['nowplaying-outer'], NP_FADE_DURATION, {
        opacity: 1,
        ease: Power1.easeOut,
      });
    }
  }

  customElements.define(CaliBreakSong.is, CaliBreakSong);
})();
