(function() {
  'use strict';

  const FADE_DURATION = 0.334;

  const currentBids = nodecg.Replicant('currentBids');
  const currentPrizes = nodecg.Replicant('currentPrizes');
  const displayDuration = nodecg.bundleConfig.displayDuration;
  const recordTrackerEnabled = nodecg.Replicant('recordTrackerEnabled');
  const total = nodecg.Replicant('total');
  let contentEnterCounter = 0;
  let contentExitCounter = 0;

  class CaliBreakContent extends Polymer.Element {
    static get is() {
      return 'cali-break-content';
    }

    ready() {
      super.ready();

      const replicants = [
        currentBids,
        currentPrizes,
        recordTrackerEnabled,
        total,
      ];

      let numDeclared = 0;
      replicants.forEach((replicant) => {
        replicant.once('change', () => {
          numDeclared++;

          // Start the loop once all replicants are declared;
          if (numDeclared >= replicants.length) {
            Polymer.RenderStatus.beforeNextRender(this, this.run);
          }
        });
      });
    }

    run() {
      const self = this;
      const parts = [
        this.showRecordTracker,
        this.showGoalTracker,
        this.showMilestones,
        this.showChallenges,
        this.showChoices,
        this.showCurrentPrizes,
      ];

      function processNextPart() {
        if (parts.length > 0) {
          const part = parts.shift().bind(self);
          promisifyTimeline(part())
            .then(processNextPart)
            .catch((error) => {
              nodecg.log.error('Error when running main loop:', error);
            });
        } else {
          self.run();
        }
      }

      function promisifyTimeline(tl) {
        return new Promise((resolve) => {
          tl.call(resolve, null, null, '+=0.03');
        });
      }

      processNextPart();
    }

    showMainContent(contents) {
      const tl = new TimelineMax();
      contents.forEach((content) => {
        tl.add(this.showContent(content));
      });
      return tl;
    }

    showContent({label, title, content}) {
      const tl = new TimelineMax();
      let outer = [
        this.$['label-outer'], this.$['title-outer'], this.$['content-outer']];
      let elements = [this.$.label, this.$.title, this.$.content];
      tl.to(outer, FADE_DURATION, {
          opacity: 0,
          ease: Power1.easeIn,
        })
        .set(this.$.label, {innerHTML: label})
        .set(this.$.title, {innerHTML: title})
        .set(this.$.content, {innerHTML: content})
        .set(elements, {x: 0})
        .add('elementsSet')
        .call(() => {
          [{
            element: this.$.title,
            scrollMultiplier: 1,
          },
          {
            element: this.$.content,
            scrollMultiplier: 1.2,
          }].forEach(({element, scrollMultiplier}) => {
            if (element.tl) {
              element.tl.kill();
            }
            if (element.scrollWidth > element.clientWidth) {
              const scrollWidth = element.scrollWidth - element.clientWidth;
              const duration = Math.max(Math.min(
                scrollWidth * scrollMultiplier / 60,
                displayDuration - 4), 0);
              element.tl = new TimelineMax();
              element.tl
                .set(element, {x: 0})
                .set({}, {delay: 2})
                .to(element, duration, {
                  ease: Linear.easeNone,
                  x: -scrollWidth,
                })
                .set({}, {delay: 2})
                .repeat(-1);
            }
          });
        })
        .to(outer, FADE_DURATION, {
          opacity: 1,
          ease: Power1.easeOut,
        })
        .set({}, {delay: displayDuration});

      return tl;
    }

    showRecordTracker() {
      const tl = new TimelineLite();

      // If we have manually disabled this feature, return.
      if (!recordTrackerEnabled.value) {
        return tl;
      }

      // If we have passed the previous event's donation total, return.
      if (total.value.raw >= CALITHON_TOTAL) {
        return tl;
      }

      const newRawValue = Math.max(window.CALITHON_TOTAL - total.value.raw, 0);

      tl.add(this.showMainContent([
        {
          label: 'RECORD TRACKER',
          title: 'ALMOST THERE!!!',
          content: this.formatRawValue(newRawValue)
            + ' to a new Calithon record! Donate now!',
        },
      ]));

      return tl;
    }

    showGoalTracker() {
      const tl = new TimelineLite();

      // If we have manually disabled this feature, return.
      if (!recordTrackerEnabled.value) {
        return tl;
      }

      // If we have passed the previous event's donation total, return.
      if (total.value.raw >= CALITHON_TOTAL
          && total.value.raw >= total.value.goalRaw) {
        return tl;
      }

      const newRawValue = Math.max(total.value.goalRaw - total.value.raw, 0);

      tl.add(this.showMainContent([
        {
          label: 'GOAL TRACKER',
          title: 'BEAT THE GOAL!!!!!',
          content: this.formatRawValue(newRawValue)
            + ' to beat Calithon 2018 goal of ' + total.value.goalFormatted
            + '! Donate now!',
        },
      ]));

      return tl;
    }

    formatRawValue(rawValue) {
      return rawValue.toLocaleString('en-US', {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
        style: 'currency',
        currency: 'USD',
      });
    }

    showMilestones() {
      const tl = new TimelineLite();

      // If there's no bids whatsoever, bail out.
      if (currentBids.value.length < 0) {
        return tl;
      }

      // Figure out what bids to display in this batch
      const bidsToDisplay = [];
      currentBids.value.forEach((bid) => {
        // Don't show closed bids in the automatic rotation.
        if (bid.state.toLowerCase() === 'closed') {
          return;
        }

        // Only show challenges.
        if (bid.type !== 'milestone') {
          return;
        }

        // If we have already have our three bids determined, we still need to
        // check if any of the remaining bids are for the same speedrun as the
        // third bid. This ensures that we are never displaying a partial list
        // of bids for a given speedrun.
        const bidLength = bidsToDisplay.length;
        if (bidLength < 1) {
          bidsToDisplay.push(bid);
        }
      });

      // If there's no challenges to display, bail out.
      if (bidsToDisplay.length <= 0) {
        return tl;
      }

      tl.add(
        this.showMainContent(
          bidsToDisplay.map((bid) => {
            return {
              label: 'UNLOCK',
              title: bid.name.replace('||', ' -- '),
              content: `Donation Total ${total.value.formatted} / ${bid.goal}`,
            };
          })
        )
      );

      return tl;
    }

    showChallenges() {
      const tl = new TimelineLite();

      // If there's no bids whatsoever, bail out.
      if (currentBids.value.length < 0) {
        return tl;
      }

      // Figure out what bids to display in this batch
      const bidsToDisplay = [];
      currentBids.value.forEach((bid) => {
        // Don't show closed bids in the automatic rotation.
        if (bid.state.toLowerCase() === 'closed') {
          return;
        }

        // Only show challenges.
        if (bid.type !== 'challenge') {
          return;
        }

        // If we have already have our three bids determined, we still need to
        // check if any of the remaining bids are for the same speedrun as the
        // third bid. This ensures that we are never displaying a partial list
        // of bids for a given speedrun.
        const bidLength = bidsToDisplay.length;
        if (bidLength < 3) {
          bidsToDisplay.push(bid);
        } else if (bid.speedrun === bidsToDisplay[bidLength - 1].speedrun) {
          bidsToDisplay.push(bid);
        }
      });

      // If there's no challenges to display, bail out.
      if (bidsToDisplay.length <= 0) {
        return tl;
      }

      tl.add(
        this.showMainContent(
          bidsToDisplay.map((bid) => {
            return {
              label: 'CHALLENGES',
              title: (bid.description || bid.name).replace('||', ' -- '),
              content: `${bid.total} / ${bid.goal}`,
            };
          })
        )
      );

      return tl;
    }

    showChoices() {
      const tl = new TimelineLite();

      // If there's no bids whatsoever, bail out.
      if (currentBids.value.length < 0) {
        return tl;
      }

      // Figure out what bids to display in this batch
      const bidsToDisplay = [];

      currentBids.value.forEach((bid) => {
        // Don't show closed bids in the automatic rotation.
        if (bid.state.toLowerCase() === 'closed') {
          return;
        }

        // Only show choices.
        if (bid.type !== 'choice-binary' && bid.type !== 'choice-many') {
          return;
        }

        // If we have already have our three bids determined, we still need to
        // check if any of the remaining bids are for the same speedrun as the
        // third bid. This ensures that we are never displaying a partial list
        // of bids for a given speedrun.
        const bidLength = bidsToDisplay.length;
        if (bidLength < 3) {
          bidsToDisplay.push(bid);
        } else if (bid.speedrun === bidsToDisplay[bidLength - 1].speedrun) {
          bidsToDisplay.push(bid);
        }
      });

      // If there's no challenges to display, bail out.
      if (bidsToDisplay.length <= 0) {
        return tl;
      }

      tl.add(
        this.showMainContent(
          bidsToDisplay.map((bid) => {
            let bids = 'Be the first to bid!';
            if (bid.options.length > 0) {
              bids = bid.options.slice(0, 3).map((option) => {
                let name =
                  (option.description || option.name).replace('||', ' -- ');
                return `${name} - ${option.total}`;
              }).join(' | ');
            }
            return {
              label: 'CHOICE',
              title: (bid.description || bid.name).replace('||', ' -- '),
              content: bids,
            };
          })
        )
      );

      return tl;
    }

    showCurrentPrizes() {
      const tl = new TimelineLite();

      // No prizes to show? Bail out.
      if (currentPrizes.value.length <= 0) {
        return tl;
      }

      const specialPrizesToDisplayLast = [];
      const prizesToDisplay = currentPrizes.value.filter((prize) => {
        if (prize.grand) {
          specialPrizesToDisplayLast.push(prize);
          return false;
        }

        return true;
      }).concat(specialPrizesToDisplayLast);

      tl.add(
        this.showMainContent(
          prizesToDisplay.map((prize) => {
            const donation = prize.sumdonations ?
              `${prize.minimumbid} in Total Donations` :
              `${prize.minimumbid} Single Donation`;
            return {
              label: 'PRIZES',
              title: prize.name,
              content: donation,
            };
          })
        )
      );

      return tl;
    }
  }

  customElements.define(CaliBreakContent.is, CaliBreakContent);
})();
