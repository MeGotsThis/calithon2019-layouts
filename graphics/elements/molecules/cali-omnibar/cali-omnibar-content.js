(function() {
  'use strict';

  const currentBids = nodecg.Replicant('currentBids');
  const currentPrizes = nodecg.Replicant('currentPrizes');
  const currentRun = nodecg.Replicant('currentRun');
  const displayDuration = nodecg.bundleConfig.displayDuration;
  const nextRun = nodecg.Replicant('nextRun');
  const recordTrackerEnabled = nodecg.Replicant('recordTrackerEnabled');
  const schedule = nodecg.Replicant('schedule');
  const stopwatch = nodecg.Replicant('stopwatch');
  const total = nodecg.Replicant('total');
  let contentEnterCounter = 0;
  let contentExitCounter = 0;

  class CaliOmnibarContent extends Polymer.Element {
    static get is() {
      return 'cali-omnibar-content';
    }

    ready() {
      super.ready();

      const replicants = [
        currentBids,
        currentPrizes,
        currentRun,
        nextRun,
        recordTrackerEnabled,
        schedule,
        stopwatch,
        total,
      ];

      let numDeclared = 0;
      replicants.forEach((replicant) => {
        replicant.once('change', () => {
          numDeclared++;

          // Start the loop once all replicants are declared;
          if (numDeclared >= replicants.length) {
            Polymer.RenderStatus.beforeNextRender(this, this.run);
            total.on('change', (newVal, oldVal) => {
              if (oldVal
                  && newVal.raw >= CALITHON_TOTAL
                  && oldVal.raw < CALITHON_TOTAL) {
                this.alertNewRecord();
              }
            });
          }
        });
      });
    }

    run() {
      const self = this;
      const parts = [
        this.showRecordTracker,
        this.showCTA,
        this.showUpNext,
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

    alertNewRecord() {
      const tl = new TimelineLite();

      // Enter
      tl.set(this.$['newRecord-text'], {y: '-100%'});
      tl.set(this.$.newRecord, {visibility: 'visible'});
      tl.to([this.$.main, this.$.label], 0.25, {
        opacity: 0,
        ease: Power1.easeIn,
      });
      tl.to(this.$['newRecord-text'], 0.334, {
        y: '0%',
        ease: Power1.easeInOut,
      }, 0.2);

      // Exit
      tl.addLabel('exit', '+=20');
      tl.to(this.$['newRecord-text'], 0.334, {
        y: '100%',
        ease: Power1.easeInOut,
      }, 'exit+=0.2');
      tl.to([this.$.main, this.$.label], 0.25, {
        opacity: 1,
        ease: Power1.easeOut,
      }, 'exit+=0.2');
    }

    showLabel(...args) {
      return TweenLite.to({}, 0.334, {
        onStart() {
          this.$.label.show(...args);
        },
        callbackScope: this,
      });
    }

    changeLabelText(...args) {
      return this.$.label.changeText(...args);
    }

    hideLabel() {
      return this.$.label.hide();
    }

    setMainContent(tl, elements) {
      // Safety buffer to avoid issues where GSAP might skip our `call`.
      tl.to({}, 0.03, {});

      tl.call(() => {
        tl.pause();
        this.$['main-content'].innerHTML = '';
        elements.forEach((element) => {
          this.$['main-content'].appendChild(element);
        });
        // Might not be necessary, but better safe than sorry.
        Polymer.flush();

        Polymer.RenderStatus.afterNextRender(this, () => {
          // Might not be necessary, but better safe than sorry.
          Polymer.flush();

          requestAnimationFrame(() => {
            tl.resume(null, false);
          });
        });
      });
    }

    showMainContent(tl, elements) {
      const contentEnterLabel = `contentEnter${contentEnterCounter}`;
      const afterContentEnterLabel = `afterContentEnter${contentEnterCounter}`;
      contentEnterCounter++;

      tl.add(contentEnterLabel);
      tl.call(() => {
        const contentEnterAnim = new TimelineLite();
        elements.forEach((element, index) => {
          contentEnterAnim.add(element.enter(), index * 0.1134);
        });
        tl.shiftChildren(
          contentEnterAnim.duration(), true,
          tl.getLabelTime(afterContentEnterLabel));
        tl.add(contentEnterAnim, contentEnterLabel);
      }, null, null, contentEnterLabel);
      tl.add(afterContentEnterLabel, '+=0.03');

      // Display the content cards long enough for people to read.
      // Scroll the list of cards if necessary to show them all.
      tl.call(() => {
        tl.pause();

        const mainWidth = this.$.main.clientWidth;
        const mainContentWidth = this.$['main-content'].clientWidth;
        const diff = mainContentWidth - mainWidth;
        if (diff > 3) {
          let holdTime = 0;
          const timePerPixel = 0.024;
          const totalScrollTime = timePerPixel * diff;
          if (totalScrollTime < displayDuration) {
            holdTime = (displayDuration - totalScrollTime) / 2;
          }
          holdTime = Math.max(holdTime, 0.35); // Clamp to 0.35 minimum;

          TweenLite.to(this.$['main-content'], totalScrollTime, {
            x: -diff,
            ease: Linear.easeNone,
            delay: holdTime,
            onComplete() {
              setTimeout(() => {
                tl.resume(null, false);
              }, holdTime * 1000);
            },
            callbackScope: this,
          });
        } else {
          setTimeout(() => {
            tl.resume(null, false);
          }, displayDuration * 1000);
        }
      }, null, null, afterContentEnterLabel);
    }

    hideMainContent(tl, elements) {
      const contentExitLabel = `contentExit${contentExitCounter}`;
      const afterContentExitLabel = `afterContentExit${contentExitCounter}`;
      contentExitCounter++;

      // Exit the content cards.
      tl.add(contentExitLabel, '+=0.03');
      tl.call(() => {
        const contentExitAnim = new TimelineLite();
        elements.slice(0).reverse().forEach((element, index) => {
          contentExitAnim.add(element.exit(), index * 0.1134);
        });
        tl.shiftChildren(
          contentExitAnim.duration(), true,
          tl.getLabelTime(afterContentExitLabel));
        tl.add(contentExitAnim, contentExitLabel);
      }, null, null, contentExitLabel);
      tl.add(afterContentExitLabel, '+=0.03');
      tl.set(this.$['main-content'], {x: 0}, afterContentExitLabel);
    }

    showRecordTracker() {
      const tl = new TimelineLite();

      // If we have manually disabled this feature, return.
      if (!recordTrackerEnabled.value) {
        return tl;
      }

      const elements = [];
      let label = 'RECORD TRACKER';
      if (total.value.raw < CALITHON_TOTAL) {
        elements.push(document.createElement('cali-omnibar-record'));
      } else if (total.value.raw < total.value.goalRaw) {
        label = 'GOAL TRACKER';
        elements.push(document.createElement('cali-omnibar-goal'));
      }

      // If we have passed the previous event's donation total and current goal,
      // return.
      if (!elements.length) {
        return tl;
      }

      this.setMainContent(tl, elements);

      tl.add(this.showLabel(label, '100%'), '+=0.03');

      this.showMainContent(tl, elements);
      this.hideMainContent(tl, elements);
      tl.add(this.hideLabel(), 'afterContentExit');

      return tl;
    }

    showCTA() {
      const tl = new TimelineLite();

      tl.set(this.$.cta, {y: '100%'});

      tl.to(this.$.cta, 0.55, {
        y: '0%',
        ease: Power2.easeOut,
      }, '+=1');

      tl.to(this.$.cta, 0.8, {
        y: '-100%',
        ease: Power2.easeInOut,
      }, `+=${displayDuration}`);

      tl.to(this.$.cta, 0.55, {
        y: '-200%',
        ease: Power2.easeIn,
      }, `+=${displayDuration}`);

      return tl;
    }

    showUpNext() {
      const tl = new TimelineLite();

      let upNextRun = nextRun.value;

      // If we're at the final run, bail out and just skip straight to showing
      // the next item in the rotation.
      if (!upNextRun) {
        return tl;
      }

      const upcomingRuns = [upNextRun];
      schedule.value.some((item) => {
        if (item.type !== 'run') {
          return false;
        }

        if (item.order <= upNextRun.order) {
          return false;
        }

        upcomingRuns.push(item);
        return upcomingRuns.length >= 3;
      });

      const elements = upcomingRuns.map((run) => {
        const element = document.createElement('cali-omnibar-run');
        element.run = run;
        return element;
      });

      this.setMainContent(tl, elements);

      tl.add(this.showLabel('COMING UP NEXT', '100%'), '+=0.03');

      this.showMainContent(tl, elements);
      this.hideMainContent(tl, elements);
      tl.add(this.hideLabel(), 'afterContentExit');

      return tl;
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

        // Only show milestones.
        if (bid.type !== 'milestone') {
          return;
        }

        const bidLength = bidsToDisplay.length;
        if (bidLength < 1) {
          bidsToDisplay.push(bid);
        }
      });

      // If there's no challenges to display, bail out.
      if (bidsToDisplay.length <= 0) {
        return tl;
      }

      const elements = bidsToDisplay.map((bid) => {
        const element = document.createElement('cali-omnibar-bid');
        element.bid = {
          ...bid,
          total: total.value.formatted,
          totalRaw: total.value.raw,
        };
        return element;
      });

      this.setMainContent(tl, elements);

      tl.add(this.showLabel('UNLOCK', '120%'), '+=0.03');

      this.showMainContent(tl, elements);
      this.hideMainContent(tl, elements);
      tl.add(this.hideLabel(), 'afterContentExit');

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

      const elements = bidsToDisplay.map((bid) => {
        const element = document.createElement('cali-omnibar-bid');
        element.bid = bid;
        return element;
      });

      this.setMainContent(tl, elements);

      tl.add(this.showLabel('CHALLENGES', '120%'), '+=0.03');

      this.showMainContent(tl, elements);
      this.hideMainContent(tl, elements);
      tl.add(this.hideLabel(), 'afterContentExit');

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

      // Loop over each bid and queue it up on the timeline
      bidsToDisplay.forEach((bid, index) => {
        // Show at most 4 options.
        const elements = bid.options.slice(0, 4).map((option, index) => {
          const element = document.createElement('cali-omnibar-bid');
          element.bid = option;
          element.index = index;

          // Options that aren't the first option show their delta to the leader
          // options.
          const amount = bid.options[0].rawTotal - option.rawTotal;
          if (index > 0 && amount > 0) {
            element.delta = '-$' + amount.toLocaleString('en-US');
          }

          return element;
        });

        if (elements.length <= 0) {
          const placeholder = document.createElement('cali-omnibar-bid');
          placeholder.bid = {};
          elements.push(placeholder);
        }

        this.setMainContent(tl, elements);

        // First bid shows the label.
        // Subsequent bids just change the text of the label.
        if (index === 0) {
          tl.add(
            this.showLabel(bid.description.replace('||', ' -- '), '80%'),
            '+=0.03');
        } else {
          tl.add(
            this.changeLabelText(bid.description.replace('||', ' -- ')),
            '+=0.03');
        }

        this.showMainContent(tl, elements);
        this.hideMainContent(tl, elements);
      });

      tl.add(this.hideLabel(), 'afterContentExit');

      return tl;
    }

    /**
     * Adds an animation to the global timeline for showing the current prizes
     * @return {undefined}
     */
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

      const elements = prizesToDisplay.map((prize) => {
        const element = document.createElement('cali-omnibar-prize');
        element.prize = prize;
        return element;
      });

      this.setMainContent(tl, elements);

      tl.add(this.showLabel('PRIZES', '160%'), '+=0.03');

      this.showMainContent(tl, elements);
      this.hideMainContent(tl, elements);
      tl.add(this.hideLabel(), 'afterContentExit');

      return tl;
    }
  }

  customElements.define(CaliOmnibarContent.is, CaliOmnibarContent);
})();
