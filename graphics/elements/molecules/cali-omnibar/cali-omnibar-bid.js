class CaliOmnibarBid extends Polymer.Element {
  static get is() {
    return 'cali-omnibar-bid';
  }

  static get properties() {
    return {
      bid: {
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

  formatDescription(bid) {
    if (bid && !(bid.description || bid.name)) {
      nodecg.log.error('Got weird bid:', JSON.stringify(bid, null, 2));
      return 'Be the first to bid!';
    }

    return bid ?
      (bid.description || bid.name).replace('||', ' -- ') :
      'Be the first to bid!';
  }

  formatTotal(bid) {
    switch (bid.type) {
      case 'milestone':
        return `Total Donations ${bid.total} / ${bid.goal}`;
      case 'challenge':
        return `${bid.total} / ${bid.goal}`;
      default:
        return bid.total;
    }
  }
}

customElements.define(CaliOmnibarBid.is, CaliOmnibarBid);
