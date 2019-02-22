(function() {
  'use strict';

  const BACKGROUND_DURATION = 300000;
  const FADE_DURATION = 0.33;

  const camera = nodecg.Replicant('break-cam');
  const total = nodecg.Replicant('total');

  const backgrounds = [
    {
      img: 'img/backgrounds/Catalina Island.png',
      text: 'Catalina Island, CA',
    },
    {
      img: 'img/backgrounds/La Jolla.png',
      text: 'La Jolla, CA',
    },
    {
      img: 'img/backgrounds/Yosemite Valley.jpg',
      text: 'Yosemite National Park, CA',
    },
    {
      img: 'img/backgrounds/Calaveras Big Trees.jpg',
      text: 'Calaveras Big Trees State Park, CA',
    },
    {
      img: 'img/backgrounds/Oceanside Pier View.png',
      text: 'Oceanside Pier, CA',
    },
    {
      img: 'img/backgrounds/SF Bay.jpg',
      text: 'San Francisco Bay, CA',
    },
    {
      img: 'img/backgrounds/Hotel Del Coronado.png',
      text: 'Hotel Del Coronado, CA',
    },
    {
      img: 'img/backgrounds/Camina de la Costa.png',
      text: 'Camina de la Costa, CA',
    },
    {
      img: 'img/backgrounds/Balboa Park.jpg',
      text: 'Balboa Park in San Diego, CA',
    },
    {
      img: 'img/backgrounds/La Jolla Shores.jpeg',
      text: 'Shores at La Jolla, CA',
    },
    {
      img: 'img/backgrounds/Mt Shasta.jpg',
      text: 'Mt Shasta, CA',
    },
  ];

  let backgroundIndex = -1;

  camera.on('change', (value) => {
    document.getElementById('scenery').hidden = value;
  });

  total.on('change', (newVal, oldVal) => {
    if (oldVal
        && newVal.raw >= CALITHON_TOTAL
        && oldVal.raw < CALITHON_TOTAL) {
      alertNewRecord();
    }
  });

  const alertNewRecord = () => {
    const total = document.getElementById('total');
    const donate = document.getElementById('donate');
    const record = document.getElementById('record');
    const text = document.getElementById('record-text');
    const tl = new TimelineMax({
    });
    tl.fromTo(total, FADE_DURATION, {
        opacity: 1,
      }, {
        opacity: 0,
      })
      .set(donate, {
        display: 'none',
      })
      .set(record, {
        display: 'block',
      })
      .to(total, FADE_DURATION, {
        opacity: 1,
      })
      .add(TweenMax.fromTo(text, 1, {
        opacity: 0,
      }, {
        repeat: 30,
        opacity: 1,
        yoyo: true,
        repeatDelay: 0.5,
      }).totalDuration(30))
      .to(total, FADE_DURATION, {
        opacity: 0,
      })
      .set(donate, {
        display: 'block',
      })
      .set(record, {
        display: 'none',
      })
      .to(total, FADE_DURATION, {
        opacity: 1,
      });
  };

  const getRandomInt = (max) => {
    return Math.floor(Math.random() * Math.floor(max));
  };

  const randomBackground = (delay = 500) => {
    let index = getRandomInt(backgrounds.length);
    while (index == backgroundIndex) {
      index = getRandomInt(backgrounds.length);
    }

    backgroundIndex = index;
    let background = backgrounds[index];

    document.getElementById('background-load').style.backgroundImage =
      `url('${background.img}')`;
    setTimeout(() => {
      document.getElementById('background-image').style.backgroundImage =
        `url('${background.img}')`;
      document.getElementById('scenery').style.backgroundImage =
        `url('${background.img}')`;
      document.getElementById('location-text').innerHTML = background.text;
    }, delay);
  };

  setInterval(randomBackground, BACKGROUND_DURATION);
  randomBackground(0);

  window.addEventListener('DOMContentLoaded', () => {
    TweenLite.to(document.body, 0.333, {
      opacity: 1,
      ease: Power1.easeOut,
    });
  });
})();
