'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// Packages
const clone = require('clone');
const equal = require("deep-equal");
const numeral = require("numeral");
const request = require("request-promise");
// Ours
const nodecgApiContext = require("./util/nodecg-api-context");
const tiltify = require('./tiltify');
const nodecg = nodecgApiContext.get();
const POLL_INTERVAL = 60 * 1000;
const currentPrizesRep = nodecg.Replicant('currentPrizes', { defaultValue: [] });
const allPrizesRep = nodecg.Replicant('allPrizes', { defaultValue: [] });
// Get initial data
update();
// Get latest prize data every POLL_INTERVAL milliseconds
setInterval(() => {
    update();
}, POLL_INTERVAL);
/**
 * Grabs the latest prizes from the tracker.
 */
 async function update() {
   const rewards = await tiltify.getRewards();

   const _allPrizes = rewards.map(formatPrize);
   const _currentPrizes = clone(_allPrizes.filter((prize) => prize.active));

   if (!equal(allPrizesRep.value, _allPrizes)) {
     allPrizesRep.value = _allPrizes;
   }

   if (!equal(currentPrizesRep.value, _currentPrizes)) {
     currentPrizesRep.value = _currentPrizes;
   }
 }
/**
 * Formats a raw prize object from the GDQ Tracker API into a slimmed-down version for our use.
 * @param rawPrize - A raw prize object from the GDQ Tracker API.
 * @returns The formatted prize object.
 */
function formatPrize(prize) {
  const active = prize.alwaysActive || (prize.active
    && (prize.startsAt === 0 || Date.now() >= prize.startsAt)
    && (prize.endsAt === 0 || Date.now() <= prize.endsAt)
    && (prize.remaining === null || prize.remaining > 0));
  return {
    id: prize.pk,
    name: prize.name,
    provided: 'Unknown',
    description: prize.name || prize.description,
    image: prize.image.src,
    minimumbid: numeral(prize.amount).format('$0,0[.]00'),
    grand: nodecg.bundleConfig.prizes.grand.includes(prize.id),
    sumdonations: nodecg.bundleConfig.prizes.sum.includes(prize.id),
    active,
    type: 'prize',
  };
}
//# sourceMappingURL=prizes.js.map
