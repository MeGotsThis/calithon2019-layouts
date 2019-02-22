(function() {
  'use strict';

  const trackerItems = nodecg.Replicant('lttp-tracker-items');
  const trackerPrizes = nodecg.Replicant('lttp-tracker-prizes');
  const trackerMedallions = nodecg.Replicant('lttp-tracker-medallions');

  const ITEM_ROWS = [[
    {name: 'hookshot'},
    {name: 'silvers'},
    {name: 'bow'},
    {name: 'boss0'},
  ], [
    {name: 'firerod'},
    {name: 'somaria'},
    {name: 'hammer'},
    {name: 'boss1'},
  ], [
    {name: 'icerod'},
    {name: 'byrna'},
    {name: 'flute'},
    {name: 'boss2'},
  ], [
    {name: 'quake'},
    {name: 'ether'},
    {name: 'bombos'},
    {name: 'boss3'},
  ], [
    {name: 'boots'},
    {name: 'moonpearl'},
    {name: 'glove', maxLevels: 2}, // has 2 variants (0-2)
    {name: 'boss4'},
  ], [
    {name: 'flippers'},
    {name: 'mirror'},
    {name: 'lantern'},
    {name: 'boss5'},
  ], [
    {name: 'powder'},
    {name: 'book'},
    {name: 'bottle', maxLevels: 4}, // can be 0-4
    {name: 'boss6'},
  ], [
    {name: 'mushroom'},
    {name: 'shovel'},
    {name: 'net'},
    {name: 'boss7'},
  ], [
    {name: 'tunic', startLevel: 1, maxLevels: 3}, // can be 1-3
    {name: 'shield', maxLevels: 3}, // can be 0-3
    {name: 'sword', maxLevels: 4}, // can be 0-4
    {name: 'boss8'},
  ], [
    {name: 'cape'},
    {name: 'boomerang', maxLevels: 3}, // can be 0-3
    {name: 'boss10'},
    {name: 'boss9'},
  ]];

  /**
   * @customElement
   * @polymer
   */
  class GdqLttpTracker extends Polymer.Element {
    static get is() {
      return 'gdq-lttp-tracker';
    }

    static get properties() {
      return {
        importPath: String,
        itemsAndPrizes: {
          type: Array,
        },
        gameIndex: {
          type: Number,
          value: 0,
        },
        mirrored: {
          type: Boolean,
          reflectToAttribute: true,
          value: false,
        },
      };
    }

    ready() {
      super.ready();

      trackerItems.on('change', this._computeItemsAndPrizes.bind(this));
      trackerPrizes.on('change', this._computeItemsAndPrizes.bind(this));
      trackerMedallions.on('change', this._computeItemsAndPrizes.bind(this));
    }

    _computeItemsAndPrizes() {
      const finalArray = [];
      if (trackerItems.status !== 'declared'
          || trackerPrizes.status !== 'declared'
          || trackerMedallions.status !== 'declared'
          || typeof this.gameIndex === 'undefined') {
        this.itemsAndPrizes = finalArray;
        return;
      }

      const items = trackerItems.value[this.gameIndex];
      const prizes = trackerPrizes.value;
      const medallions = trackerMedallions.value;

      if (!items || items.length <= 0
        || !prizes || prizes.length <= 0
        || !medallions || medallions.length <= 0) {
        this.itemsAndPrizes = finalArray;
        return;
      }

      ITEM_ROWS.forEach((row, rowIndex) => {
        row.forEach((item, itemIndex) => {
          const itemValue = items[item.name];

          if (itemIndex === 3) {
            // Empty placeholder for the 4th column, which is blank.
            finalArray.push({});
          }

          finalArray.push({
            name: item.name,
            hasLevels: !!item.maxLevels,
            level: itemValue,
            dimmed: itemValue === 0 || itemValue === false,
            rowIndex,
            itemIndex,
          });
        });

        // Dungeon prize.
        const dungeonInfo = {
          name: 'dungeon',
          hasLevels: true,
          level: prizes[rowIndex],
          dimmed: false,
          rowIndex,
        };

        // Only these two bosses have medallion info.
        if (rowIndex === 8 || rowIndex === 9) {
          dungeonInfo.medallionLevel = medallions[rowIndex];
        }

        finalArray.push(dungeonInfo);
      });

      this.itemsAndPrizes = finalArray;
    }

    _calcCellClass(itemOrPrize, index) {
      const classes = new Set(['cell']);
      const sixesRemainder = (index + 1) % 6;

      if (itemOrPrize.dimmed) {
        classes.add('cell--dimmed');
      }

      if (sixesRemainder === 0) {
        classes.add('cell--prize');
      } else if (sixesRemainder === 4) {
        classes.add('cell--zeroWidth');
      }

      return Array.from(classes).join(' ');
    }

    _calcCellSrc(itemOrPrize) {
      let src = itemOrPrize.name;

      if (itemOrPrize.hasLevels) {
        if (typeof itemOrPrize.level === 'number') {
          src += itemOrPrize.level;
        } else {
          return 'blank-pixel';
        }
      }

      return src ? src : 'blank-pixel';
    }

    _hasMedallion(itemOrPrize) {
      return 'medallionLevel' in itemOrPrize;
    }

    _calcCellMedallionSrc(itemOrPrize) {
      if (itemOrPrize.name !== 'dungeon') {
        return 'blank-pixel';
      }

      return `medallion${itemOrPrize.medallionLevel || 0}`;
    }

    _handleClickImage(e) {
      const itemOrPrize = e.target.trackeritem;
      if (itemOrPrize.name === 'dungeon') {
        const prizes = trackerPrizes.value;
        prizes[itemOrPrize.rowIndex] = (prizes[itemOrPrize.rowIndex] + 1) % 5;
        return;
      }

      const items = trackerItems.value[this.gameIndex];
      const item = ITEM_ROWS[itemOrPrize.rowIndex][itemOrPrize.itemIndex];
      if (item.maxLevels) {
        if (items[itemOrPrize.name] >= item.maxLevels) {
          items[itemOrPrize.name] = item.startLevel || 0;
        } else {
          items[itemOrPrize.name]++;
        }
      } else {
        items[itemOrPrize.name] = !items[itemOrPrize.name];
      }
    }

    _handleResetImage(e) {
      const itemOrPrize = e.target.trackeritem;
      setTimeout(() => {
        if (itemOrPrize.name === 'dungeon') {
          const prizes = trackerPrizes.value;
          prizes[itemOrPrize.rowIndex] = 0;
          return;
        }

        const items = trackerItems.value[this.gameIndex];
        const item = ITEM_ROWS[itemOrPrize.rowIndex][itemOrPrize.itemIndex];
        if (item.maxLevels) {
          items[itemOrPrize.name] = item.startLevel || 0;
        } else {
          items[itemOrPrize.name] = false;
        }
      }, 100);
    }

    _handleClickMedallion(e) {
      const itemOrPrize = e.target.trackeritem;
      if (!('medallionLevel' in itemOrPrize)) {
        return;
      }
      const medallions = trackerMedallions.value;
      medallions[itemOrPrize.rowIndex] =
        (medallions[itemOrPrize.rowIndex] + 1) % 4;
    }

    _handleResetMedallion(e) {
      const itemOrPrize = e.target.trackeritem;
      if (!('medallionLevel' in itemOrPrize)) {
        return;
      }
      setTimeout(() => {
        const medallions = trackerMedallions.value;
        medallions[itemOrPrize.rowIndex] = 0;
      }, 100);
    }
  }

  customElements.define(GdqLttpTracker.is, GdqLttpTracker);
})();
