(function() {
  'use strict';

  const currentRun = nodecg.Replicant('currentRun');
  currentRun.on('change', (value) => {
    let element;
    document.getElementById('name1').innerHTML =
      (value.runners[0] || {name: '?'}).name;
    document.getElementById('name2').innerHTML =
      (value.runners[1] || {name: '?'}).name;
  });
})();
