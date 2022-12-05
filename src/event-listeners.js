const addListeners = ({
  exportFrame,
  fitToScreen,
  toggleBorder,
  toggleCutouts,
  toggleTexture,
  toggleShapes,
  seed,
}) => {
  const save = () => {
    if (document.complete) {
      document.querySelector('.save-overlay').style.opacity = 0.75;
      document.querySelector('.save-text').style.opacity = 1;
      window.setTimeout(() => {
        exportFrame();
        document.querySelector('.save-overlay').style.opacity = 0;
        document.querySelector('.save-text').style.opacity = 0;
      }, 100);
    }
  };

  window.addEventListener('keydown', e => {
    switch (e.key) {
      case 's':
        save();
        break;

      case 'r':
        window.location.reload();
        break;

      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
        if (e.metaKey) return;
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('scale', e.key);
        if (e.key === '1') {
          urlParams.delete('scale');
        }
        window.location.search = urlParams;
        break;

      case 'f':
        if (e.metaKey) return;
        const fitParams = new URLSearchParams(window.location.search);
        if (fitToScreen) {
          fitParams.delete('fitToScreen');
        } else {
          fitParams.set('fitToScreen', true);
        }
        window.location.search = fitParams;
        break;

      case 't':
        if (e.metaKey) return;
        toggleTexture();
        break;

      case 'h':
        if (e.metakey) return;
        toggleShapes();
        break;

      case 'k':
        if (e.metaKey) return;
        const seedParams = new URLSearchParams(window.location.search);
        const currentSeed = seedParams.get('seed');
        if (currentSeed) {
          seedParams.delete('seed');
        } else {
          seedParams.set('seed', seed);
        }
        window.location.search = seedParams;
        break;

      // case 'p':
      //   if (e.metaKey) return;
      //   const printParams = new URLSearchParams(window.location.search);
      //   printParams.set('grain', false);
      //   printParams.set('scale', 6);
      //   window.location.search = printParams;
      //   break;

      case 'b':
        toggleBorder();
        break;
      case 'c':
        toggleCutouts();
        break;
    }
  });

  let lastTap = null;
  window.addEventListener('touchend', e => {
    if (e.touches.length === 0) {
      e.preventDefault();
      if (lastTap === null) {
        lastTap = e.timeStamp;
      } else {
        if (e.timeStamp - lastTap < 500) {
          save();
        } else {
          lastTap = e.timeStamp;
        }
      }
    }
  });
};

export default addListeners;
