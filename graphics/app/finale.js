(function() {
  'use strict';

  const nowPlayingDisplay = document.getElementById('nowPlaying');
  const gpmd = nodecg.Replicant('gpmd');

  gpmd.on('change', (newVal, oldVal) => {
    if (typeof newVal === 'undefined' || !newVal.playState) {
      return;
    }
    if (typeof oldVal !== 'undefined'
        && oldVal.playState
        && newVal.track.title === oldVal.track.title
        && newVal.track.album === oldVal.track.album) {
      return;
    }

    TweenLite.to(nowPlayingDisplay, 0.33, {
      opacity: 0,
      ease: Power1.easeInOut,
      onComplete() {
        let {title, album} = newVal.track;
        if (album) {
          nowPlayingDisplay.innerText = `${title} - ${album}`;
        } else {
          nowPlayingDisplay.innerText = `${title}`;
        }

        const MAX_NOW_PLAYING_WIDTH = nowPlayingDisplay.clientWidth;
        const width = nowPlayingDisplay.scrollWidth;
        if (width > MAX_NOW_PLAYING_WIDTH) {
          TweenLite.set(nowPlayingDisplay, {
            scaleX: MAX_NOW_PLAYING_WIDTH / width,
          });
        } else {
          TweenLite.set(nowPlayingDisplay, {
            scaleX: 1,
          });
        }

        TweenLite.to(nowPlayingDisplay, 0.33, {
          opacity: 1,
          ease: Power1.easeInOut,
        });
      },
    });
  });
})();
