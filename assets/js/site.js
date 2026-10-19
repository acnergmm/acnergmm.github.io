// Puerto Santo Domingo · comportamiento del sitio. Sin dependencias ni servicios de terceros antes del consentimiento.
// Regla del movimiento: el HTML y el CSS ya muestran el estado final. Este archivo sólo agrega la animación, y nunca
// cuando el visitante pidió reducir movimiento o la pausó con el botón de la portada.
(function () {
  'use strict';
  var body = document.body;
  var raiz = document.documentElement;
  var revision = body.getAttribute('data-revision') === '1';
  var lang = raiz.lang === 'en' ? 'en' : 'es';
  var reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var guardado = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var guardar_ = function (k, v) { try { if (v === null) { localStorage.removeItem(k); } else { localStorage.setItem(k, v); } } catch (e) {} };
  var quieto = function () { return raiz.classList.contains('quieto'); };
  if (!reducir) { raiz.classList.add('mov'); }
  if (!reducir && guardado('psd-quieto') === '1') { raiz.classList.add('quieto'); }
  var observar = function (els, alEntrar, opciones) {
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { alEntrar(el); }); return; }
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) { if (en.isIntersecting) { alEntrar(en.target); io.unobserve(en.target); } });
    }, opciones || { threshold: 0.18 });
    els.forEach(function (el) { io.observe(el); });
  };

  // ---------- encabezado: sólido al bajar, se oculta al bajar y vuelve al subir; barra de progreso ----------
  var header = document.querySelector('.site-header');
  var progreso = document.createElement('span');
  progreso.className = 'progreso';
  progreso.setAttribute('aria-hidden', 'true');
  header.appendChild(progreso);
  var ultimoY = window.scrollY;
  var pendiente = false;
  var alDesplazar = function () {
    pendiente = false;
    var y = window.scrollY;
    header.classList.toggle('solido', y > 40);
    if (!header.classList.contains('abierto')) {
      if (y > ultimoY + 6 && y > 220) { header.classList.add('oculto'); }
      else if (y < ultimoY - 6 || y < 220) { header.classList.remove('oculto'); }
    }
    ultimoY = y;
    var alto = document.documentElement.scrollHeight - window.innerHeight;
    progreso.style.transform = 'scaleX(' + (alto > 0 ? Math.min(1, y / alto) : 0) + ')';
    if (manifiesto) { encenderManifiesto(); }
  };
  window.addEventListener('scroll', function () { if (!pendiente) { pendiente = true; window.requestAnimationFrame(alDesplazar); } }, { passive: true });
  header.addEventListener('focusin', function () { header.classList.remove('oculto'); });

  // sin JavaScript, «Menú» es un enlace al menú del pie; acá pasa a ser el botón que abre el panel
  var botonMenu = document.querySelector('.boton-menu');
  if (botonMenu) {
    botonMenu.setAttribute('role', 'button');
    botonMenu.setAttribute('aria-expanded', 'false');
    botonMenu.addEventListener('keydown', function (ev) {
      if (ev.key === ' ') { ev.preventDefault(); botonMenu.click(); }
    });
    botonMenu.addEventListener('click', function (ev) {
      ev.preventDefault();
      var abierto = header.classList.toggle('abierto');
      botonMenu.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      botonMenu.textContent = botonMenu.getAttribute(abierto ? 'data-cerrar' : 'data-abrir');
      document.documentElement.style.overflow = abierto ? 'hidden' : '';
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && header.classList.contains('abierto')) { botonMenu.click(); botonMenu.focus(); }
    });
  }

  // ---------- aparición al bajar ----------
  if (!reducir) {
    var aRevelar = document.querySelectorAll('.bloque .wrap > *, .banda .wrap > *, .ficha-grupo, .galeria figure, .noticia, .tarjeta, .via, .puntos li, .secuencia li, .cifra, .documentos li');
    var grupos = new Map();
    aRevelar.forEach(function (el) {
      if (el.closest('.recorrido') || el.closest('.manifiesto-texto')) { return; }
      var padre = el.parentElement;
      var i = grupos.get(padre) || 0;
      grupos.set(padre, i + 1);
      el.style.setProperty('--i', Math.min(i, 6));
      el.classList.add('revela');
    });
    observar(Array.prototype.slice.call(document.querySelectorAll('.revela')), function (el) { el.classList.add('visto'); }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  }

  // ---------- cifras que se cuentan ----------
  var separador = lang === 'es' ? '.' : ',';
  var conMiles = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, separador); };
  var contar = function (el) {
    if (el.getAttribute('data-contado')) { return; }
    el.setAttribute('data-contado', '1');
    var final = el.textContent;
    var n = parseInt(el.getAttribute('data-n'), 10);
    if (reducir || quieto() || !(n > 0)) { return; }
    var t0 = null;
    var dur = 1300;
    var paso = function (t) {
      if (t0 === null) { t0 = t; }
      var p = Math.min(1, (t - t0) / dur);
      var v = Math.round(n * (1 - Math.pow(1 - p, 3)));
      el.textContent = p < 1 ? conMiles(v) : final;
      if (p < 1) { window.requestAnimationFrame(paso); }
    };
    window.requestAnimationFrame(paso);
  };
  observar(Array.prototype.slice.call(document.querySelectorAll('.hid-datos .contar, .nivel .contar')), contar, { threshold: 0.6 });

  // ---------- portada: fotos que se funden, hora en Villeta y pausa ----------
  var portada = document.querySelector('.portada');
  var temporizador = null;
  var fotos = [];
  var actual = 0;
  var siguienteFoto = function () {
    if (fotos.length < 2 || quieto()) { return; }
    var prev = fotos[actual];
    actual = (actual + 1) % fotos.length;
    var nueva = fotos[actual];
    nueva.classList.remove('vista');
    void nueva.offsetWidth;
    nueva.classList.add('vista', 'activa');
    prev.classList.remove('activa');
  };
  var arrancarFotos = function () { if (!temporizador && fotos.length > 1 && !quieto()) { temporizador = window.setInterval(siguienteFoto, 6500); } };
  var pararFotos = function () { if (temporizador) { window.clearInterval(temporizador); temporizador = null; } };
  if (portada) {
    var plantilla = portada.querySelector('template[data-fotos]');
    var contenedor = portada.querySelector('.portada-fotos');
    var primera = contenedor && contenedor.querySelector('.foto');
    if (primera) { fotos.push(primera); }
    if (plantilla && !reducir) {
      // las fotos de más esperan a que cargue la página, para no competir con la primera (el LCP)
      var sumar = function () {
        window.setTimeout(function () {
          var frag = plantilla.content.cloneNode(true);
          Array.prototype.forEach.call(frag.querySelectorAll('img'), function (img) { img.loading = 'eager'; fotos.push(img); });
          contenedor.appendChild(frag);
          portada.classList.add('viva');
          primera.classList.add('vista');
          arrancarFotos();
        }, 1200);
      };
      if (document.readyState === 'complete') { sumar(); } else { window.addEventListener('load', sumar); }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { if (en[0].isIntersecting) { arrancarFotos(); } else { pararFotos(); } }).observe(portada);
      }
    }
    var hora = portada.querySelector('[data-hora]');
    if (hora && window.Intl) {
      try {
        var fh = new Intl.DateTimeFormat(lang === 'es' ? 'es-PY' : 'en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Asuncion' });
        var fz = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Asuncion', timeZoneName: 'shortOffset' });
        var ponerHora = function () {
          var ahora = new Date();
          hora.querySelector('time').textContent = fh.format(ahora);
          var z = fz.formatToParts(ahora).filter(function (p) { return p.type === 'timeZoneName'; })[0];
          hora.querySelector('.riel-gmt').textContent = z ? z.value.replace('-', '−') : '';
        };
        ponerHora();
        hora.hidden = false;
        window.setInterval(ponerHora, 30000);
      } catch (e) { /* sin zona horaria en este navegador: el dato queda oculto */ }
    }
    var pausa = portada.querySelector('.riel-pausa');
    if (pausa && !reducir) {
      var rotular = function () {
        var q = quieto();
        pausa.setAttribute('aria-pressed', q ? 'true' : 'false');
        pausa.textContent = pausa.getAttribute(q ? 'data-reanudar' : 'data-pausar');
      };
      pausa.hidden = false;
      rotular();
      pausa.addEventListener('click', function () {
        var q = raiz.classList.toggle('quieto');
        guardar_('psd-quieto', q ? '1' : null);
        if (q) { pararFotos(); } else { arrancarFotos(); }
        rotular();
      });
    }
  }

  // ---------- manifiesto: el párrafo se enciende palabra por palabra al bajar ----------
  var manifiesto = null;
  var palabras = [];
  var encenderManifiesto = function () {
    var r = manifiesto.getBoundingClientRect();
    var vh = window.innerHeight;
    var p = Math.max(0, Math.min(1, (vh * 0.88 - r.top) / (r.height + vh * 0.32)));
    var n = Math.round(p * palabras.length);
    for (var k = 0; k < palabras.length; k++) { palabras[k].classList.toggle('on', k < n); }
  };
  var texto = document.querySelector('[data-manifiesto]');
  if (texto && !reducir) {
    manifiesto = texto;
    palabras = Array.prototype.slice.call(texto.querySelectorAll('.w'));
    texto.closest('.manifiesto').classList.add('manifiesto-vivo');
    encenderManifiesto();
  }

  // ---------- recorrido: cada paso mueve la cámara de la maqueta ----------
  var iso = document.querySelector('.recorrido .iso');
  if (iso) {
    var pasos = Array.prototype.slice.call(document.querySelectorAll('.recorrido .paso'));
    var activar = function (paso) {
      pasos.forEach(function (p) { p.classList.toggle('actual', p === paso); });
      iso.setAttribute('data-paso', paso.getAttribute('data-paso'));
      var c = paso.querySelector('.contar');
      if (c) { contar(c); }
    };
    if ('IntersectionObserver' in window) {
      var ioPasos = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) { if (en.isIntersecting) { activar(en.target); } });
      }, { rootMargin: '-48% 0px -48% 0px' });
      pasos.forEach(function (p) { ioPasos.observe(p); });
    }
    if (pasos[0]) { pasos[0].classList.add('actual'); }
  }

  // ---------- mapa y nivel del tanque: se dibujan al entrar en pantalla ----------
  if (!reducir) {
    var dibujables = Array.prototype.slice.call(document.querySelectorAll('.hidrovia, .expansion'));
    dibujables.forEach(function (s) { s.classList.add(s.classList.contains('hidrovia') ? 'por-dibujar' : 'por-llenar'); });
    observar(dibujables, function (s) { s.classList.add('visto'); }, { threshold: 0.3 });
  }

  // ---------- consentimiento (Consent Mode v2, modo básico) ----------
  // La elección vive en la cookie propia psd_consent durante 12 meses, como dice la política de cookies.
  var COOKIE = 'psd_consent';
  var VIGENCIA = 31536000; // segundos: 365 días
  var VERSION = 'cookies-2026-12-15';
  var GA = body.getAttribute('data-ga');
  var banner = document.getElementById('consent');
  var prefs = document.getElementById('consent-prefs');
  var gaCargado = false;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  var leer = function () {
    var m = document.cookie.match(/(?:^|;\s*)psd_consent=([^;]+)/);
    if (!m) { return null; }
    try { return JSON.parse(decodeURIComponent(m[1])); } catch (e) { return null; }
  };
  var escribir = function (dato) {
    var seguro = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = COOKIE + '=' + encodeURIComponent(JSON.stringify(dato)) + '; Max-Age=' + VIGENCIA + '; Path=/; SameSite=Lax' + seguro;
  };
  var borrarAnalitica = function () {
    var dominios = ['', location.hostname, '.' + location.hostname.replace(/^www\./, '')];
    document.cookie.split(';').forEach(function (c) {
      var nombre = c.split('=')[0].trim();
      if (nombre === '_ga' || nombre.indexOf('_ga_') === 0) {
        dominios.forEach(function (d) { document.cookie = nombre + '=; Max-Age=0; Path=/' + (d ? '; Domain=' + d : ''); });
      }
    });
  };
  var cargarGA = function () {
    if (!GA || gaCargado) { return; }
    gaCargado = true;
    gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('js', new Date());
    gtag('config', GA, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA);
    document.head.appendChild(s);
  };
  var evento = function (nombre, datos) { if (gaCargado) { gtag('event', nombre, datos || {}); } };
  var guardar = function (analitica, mecanismo) {
    var antes = leer();
    escribir({ id: (antes && antes.id) || ((window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now())), analitica: !!analitica,
               fecha: new Date().toISOString(), version: VERSION, idioma: document.documentElement.lang, mecanismo: mecanismo || '' });
    banner.hidden = true;
    if (analitica) { cargarGA(); return; }
    // retirar el consentimiento: se apaga la etiqueta, se borran sus cookies y se recarga para descargarla
    if (gaCargado || (antes && antes.analitica)) {
      if (GA) { window['ga-disable-' + GA] = true; }
      gtag('consent', 'update', { analytics_storage: 'denied' });
      borrarAnalitica();
      if (gaCargado) { window.location.reload(); }
    }
  };
  if (banner) {
    var previo = leer();
    var vencido = previo && previo.fecha && (Date.now() - Date.parse(previo.fecha)) > VIGENCIA * 1000;
    if (!previo || previo.version !== VERSION || vencido) { banner.hidden = false; }
    else if (previo.analitica) { cargarGA(); }
    document.getElementById('c-aceptar').addEventListener('click', function () { guardar(true, 'aceptar'); });
    document.getElementById('c-rechazar').addEventListener('click', function () { guardar(false, 'rechazar'); });
    var cerrar = document.getElementById('c-cerrar');
    if (cerrar) { cerrar.addEventListener('click', function () { guardar(false, 'cerrar'); }); }
    banner.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { guardar(false, 'cerrar'); } });
    var conf = document.getElementById('c-configurar');
    conf.addEventListener('click', function () { prefs.hidden = !prefs.hidden; conf.setAttribute('aria-expanded', prefs.hidden ? 'false' : 'true'); });
    document.getElementById('c-guardar').addEventListener('click', function () { guardar(document.getElementById('c-analitica').checked, 'configurar'); });
    var reabrir = document.getElementById('cookie-prefs');
    if (reabrir) {
      reabrir.addEventListener('click', function () {
        var p = leer();
        document.getElementById('c-analitica').checked = !!(p && p.analitica);
        banner.hidden = false; prefs.hidden = false; conf.setAttribute('aria-expanded', 'true');
        document.getElementById('c-guardar').focus();
      });
    }
  }
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-evento]');
    if (a) {
      evento(a.getAttribute('data-evento'), { destino: a.getAttribute('href') || '' });
      if (a.getAttribute('data-evento') === 'cambio_idioma') { try { localStorage.setItem('psd-idioma', a.getAttribute('hreflang')); } catch (e) {} }
    }
  });

  // ---------- formularios ----------
  var CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var t0 = form.querySelector('input[name="t0"]');
    if (t0) { t0.value = String(Date.now()); }
    var estado = form.querySelector('.estado');
    var boton = form.querySelector('button[type="submit"]');
    var textoBoton = boton ? boton.textContent : '';
    var msj = {
      es: { campo: 'Complete este campo.', correo: 'Escriba un correo válido, por ejemplo nombre@empresa.com.', envio: 'No pudimos enviar el mensaje. Escríbanos directamente a la dirección indicada.', limite: 'Recibimos varios envíos seguidos. Espere unos minutos y vuelva a intentarlo.', simulado: 'Vista de revisión: el envío no se realiza.' },
      en: { campo: 'Please fill in this field.', correo: 'Enter a valid email, for example name@company.com.', envio: 'We could not send your message. Please write to us directly at the address shown.', limite: 'We received several messages in a row. Please wait a few minutes and try again.', simulado: 'Review build: the message is not sent.' }
    }[lang];
    var marcar = function (campo, texto) {
      campo.setAttribute('aria-invalid', texto ? 'true' : 'false');
      var err = document.getElementById(campo.getAttribute('aria-describedby'));
      if (err) { err.textContent = texto || ''; }
    };
    var validar = function () {
      var primero = null;
      form.querySelectorAll('input[required], select[required], textarea[required]').forEach(function (c) {
        var v = c.value.trim(); var m = '';
        if (c.type === 'checkbox') { m = c.checked ? '' : (c.getAttribute('data-error') || msj.campo); }
        else if (!v) { m = msj.campo; } else if (c.type === 'email' && !CORREO.test(v)) { m = msj.correo; }
        marcar(c, m);
        if (m && !primero) { primero = c; }
      });
      return primero;
    };
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      estado.textContent = ''; estado.className = 'estado';
      var error = validar();
      if (error) { error.focus(); return; }
      var datos = {};
      new FormData(form).forEach(function (v, k) { datos[k] = typeof v === 'string' ? v.trim() : v; });
      delete datos.acepto; // la casilla se valida en el navegador; el contrato de la API no la recibe
      if (revision) {
        estado.textContent = msj.simulado; estado.className = 'estado bien';
        setTimeout(function () { window.location.href = form.getAttribute('data-gracias'); }, 1200);
        return;
      }
      boton.disabled = true; boton.textContent = boton.getAttribute('data-enviando') || textoBoton;
      fetch(form.getAttribute('data-endpoint'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos), credentials: 'same-origin' })
        .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'envio' }; }).then(function (j) { return { status: r.status, j: j }; }); })
        .then(function (res) {
          if (res.status === 200 && res.j.ok) {
            evento('envio_formulario', { formulario: form.getAttribute('data-form') });
            window.location.href = form.getAttribute('data-gracias');
            return;
          }
          if (res.status === 400 && res.j.campos) {
            res.j.campos.forEach(function (n) { var c = form.querySelector('[name="' + n + '"]'); if (c) { marcar(c, n === 'correo' ? msj.correo : msj.campo); } });
            var c0 = form.querySelector('[aria-invalid="true"]'); if (c0) { c0.focus(); }
          } else {
            estado.textContent = res.status === 429 ? msj.limite : msj.envio; estado.className = 'estado mal';
          }
          if (window.turnstile) { try { window.turnstile.reset(); } catch (e) {} }
        })
        .catch(function () { estado.textContent = msj.envio; estado.className = 'estado mal'; })
        .then(function () { boton.disabled = false; boton.textContent = textoBoton; });
    });
  });

  alDesplazar();
})();
