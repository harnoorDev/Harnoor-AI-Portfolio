/* Runs before first paint: theme + accent, motion flags, intro decision, and
   failsafes so content can never stay hidden if the main bundle fails. */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  try {
    var t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') d.setAttribute('data-theme', t);
    var a = localStorage.getItem('accent');
    if (a && /^(acid|plasma|phosphor|cyan)$/.test(a)) d.setAttribute('data-accent', a);
  } catch (e) { /* storage blocked: defaults apply */ }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = false;
  try { seen = sessionStorage.getItem('boot-seen') === '1'; } catch (e) { seen = true; }
  if (!reduce && !seen && !location.hash) d.classList.add('boot');

  window.__siteReady = false;
  setTimeout(function () {
    if (!window.__siteReady) {
      d.classList.add('reveal-fallback');
      d.classList.remove('boot');
    }
  }, 5000);
})();
