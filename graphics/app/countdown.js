(function() {
  'use strict';

  const countdown = document.getElementById('countdown');
  const countdownMinutes = document.getElementById('countdownMinutes');
  const countdownSeconds = document.getElementById('countdownSeconds');
  const countdownColon = document.getElementById('countdownColon');
  const nowPlayingDisplay = document.getElementById('nowPlaying');
  const countdownTime = nodecg.Replicant('countdown');
  const countdownRunning = nodecg.Replicant('countdownRunning');
  const gpmd = nodecg.Replicant('gpmd');

  const colonFlashAnim = new TimelineMax({repeatDelay: 0.5});
  colonFlashAnim.set(countdownColon, {visibility: 'visible'});
  colonFlashAnim.set(countdownColon, {visibility: 'hidden'}, 0.5);

  const zeroFlashAnim = new TimelineMax({repeat: -1});
  zeroFlashAnim.set(countdown, {visibility: 'visible'});
  zeroFlashAnim.set(countdown, {visibility: 'hidden'}, 1);
  zeroFlashAnim.set(countdown, {visibility: 'visible'}, 2);

  countdownTime.on('change', (newVal) => {
    countdownMinutes.innerText =
      newVal.minutes < 10 ? `0${newVal.minutes}` : newVal.minutes;
    countdownSeconds.innerText =
      newVal.seconds < 10 ? `0${newVal.seconds}` : newVal.seconds;
    colonFlashAnim.play(0);

    if (newVal.raw <= 10) {
      countdown.style.color = '#ff0000';
    } else {
      countdown.style.color = '#ffffff';
    }

    if (newVal.raw === 0) {
      colonFlashAnim.play(0);
      colonFlashAnim.stop();
      zeroFlashAnim.play(0);
    } else {
      zeroFlashAnim.stop();
      countdown.style.visibility = 'visible';
    }
  });

  countdownRunning.on('change', (newVal) => {
    if (newVal) {
      colonFlashAnim.repeat(0);
    } else {
      colonFlashAnim.play(0);
      colonFlashAnim.repeat(-1);
    }
  });

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
