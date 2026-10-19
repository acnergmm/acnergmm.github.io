// Raíz del sitio: lleva a /es/ si el navegador declara español; si no, a /en/. No usa la IP.
(function () {
  var langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
  var es = false;
  for (var i = 0; i < langs.length; i++) { if (String(langs[i]).toLowerCase().indexOf('es') === 0) { es = true; break; } }
  try { var elegido = localStorage.getItem('psd-idioma'); if (elegido === 'es' || elegido === 'en') { es = elegido === 'es'; } } catch (e) {}
  window.location.replace(es ? '/es/' : '/en/');
})();
