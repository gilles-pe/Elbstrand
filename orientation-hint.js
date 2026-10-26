(() => {
  'use strict';
  const scene = document.querySelector('#scene');
  const hint = document.querySelector('#orientation-hint');
  const portrait = window.matchMedia('(max-width: 900px) and (orientation: portrait)');
  let shown = false, delay = 0, finish = 0;

  function hide() {
    clearTimeout(delay);
    clearTimeout(finish);
    hint.hidden = true;
    hint.classList.remove('is-playing');
  }

  function update() {
    hide();
    if (shown || !portrait.matches || document.hidden || !scene.classList.contains('loaded')) return;
    // Give the painting six uninterrupted seconds before the one-time invitation.
    delay = setTimeout(() => {
      shown = true;
      hint.hidden = false;
      hint.classList.add('is-playing');
      // 1.6 s arrival, 4 s at rest, 1.8 s departure; also works with reduced motion.
      finish = setTimeout(hide, 7400);
    }, 6000);
  }

  portrait.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  const loading = new MutationObserver(() => {
    if (!scene.classList.contains('loaded')) return;
    loading.disconnect();
    update();
  });
  if (scene.classList.contains('loaded')) update();
  else loading.observe(scene, { attributes: true, attributeFilter: ['class'] });
})();
