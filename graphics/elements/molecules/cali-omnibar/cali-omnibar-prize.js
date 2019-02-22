class CaliOmnibarPrize extends Polymer.Element {
  static get is() {
    return 'cali-omnibar-prize';
  }

  static get properties() {
    return {
      prize: {
        type: Object,
      },
    };
  }

  enter() {
    const enterTL = new TimelineLite();
    enterTL.set(this.$.text, {y: '100%'});
    enterTL.to(this.$.text, 0.334, {
      y: '0%',
      ease: Power1.easeInOut,
    }, 0.2);
    return enterTL;
  }

  exit() {
    const exitTL = new TimelineLite();
    exitTL.to(this.$.text, 0.334, {
      y: '-100%',
      ease: Power1.easeInOut,
    }, 0.2);
    return exitTL;
  }

  calcBidAmountText(prize) {
    return prize.sumdonations ?
      `${prize.minimumbid} in Total Donations` :
      `${prize.minimumbid} Single Donation`;
  }
}

customElements.define(CaliOmnibarPrize.is, CaliOmnibarPrize);
