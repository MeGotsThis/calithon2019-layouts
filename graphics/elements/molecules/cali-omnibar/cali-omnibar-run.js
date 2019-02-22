class CaliOmnibarRun extends Polymer.Element {
  static get is() {
    return 'cali-omnibar-run';
  }

  static get properties() {
    return {
      run: {
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

  formatName(name) {
    return name.replace('\\n', ' ').trim();
  }

  concatenateRunners(run) {
    let concatenatedRunners =
      run.runners.length == 0 ? '?' : run.runners[0].name;
    if (run.runners.length > 1) {
      concatenatedRunners =
        run.runners.slice(1).reduce((prev, curr, index, array) => {
          if (index === array.length - 1) {
            return `${prev} & ${curr.name}`;
          }

          return `${prev}, ${curr.name}`;
        }, concatenatedRunners);
    }
    return concatenatedRunners;
  }
}

customElements.define(CaliOmnibarRun.is, CaliOmnibarRun);
