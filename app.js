'use strict';
const CLAVE = 'pwa-camara-aviso-aceptado';
let stream = null, modo = 'environment', ocupado = false, consultando = false, deferred = null;
function $(id) { return document.getElementById(id); }
function lente(m) { return m === 'environment' ? 'trasera' : 'frontal'; }
function estado(msg, tipo) {
  const c = tipo === 'activa' ? 'dot online' : tipo === 'error' ? 'dot offline' : 'dot';
  const b = $('badge-camara'); if (b) { b.className = c; b.title = msg; }
  const p = $('punto-estado'); if (p) p.className = c;
  const t = $('mensaje-estado'); if (t) t.textContent = msg;
}
function botones() {
  const a = !!stream;
  $('btn-preparar-camara').disabled = a || ocupado || consultando;
  $('texto-preparar').textContent = 'Encender cámara ' + lente(modo);
  $('btn-alternar-camara').disabled = !a || ocupado;
  $('btn-apagar-camara').disabled = !a;
}
function marca(guardar) {
  try {
    if (guardar) { localStorage.setItem(CLAVE, '1'); return true; }
    return localStorage.getItem(CLAVE) === '1';
  } catch (e) { return false; }
}
function detener() {
  if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
  const v = $('visor-camara'); if (v) v.srcObject = null;
  $('visor-wrap').classList.remove('activa');
  botones();
}
function errorCamara(e) {
  const n = e && e.name;
  const m = {
    NotAllowedError: 'Permiso denegado. Habilita la cámara en los ajustes del navegador.',
    SecurityError: 'Permiso denegado. Habilita la cámara en los ajustes del navegador.',
    NotFoundError: 'No se detectó ninguna cámara en este dispositivo.',
    NotReadableError: 'La cámara está ocupada por otra aplicación.',
    OverconstrainedError: 'Este dispositivo no tiene el lente solicitado.'
  };
  estado(m[n] || 'Error al acceder al hardware: ' + (e && e.message ? e.message : 'desconocido'), 'error');
}
function iniciar(m) {
  if (ocupado) return Promise.resolve(false);
  ocupado = true; botones();
  estado('Solicitando permiso y encendiendo cámara ' + lente(m) + '...', 'proceso');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    ocupado = false; botones();
    estado('Este navegador no soporta acceso a cámara.', 'error');
    return Promise.resolve(false);
  }
  detener();
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: m } }, audio: false })
    .then(function (s) {
      stream = s;
      const v = $('visor-camara'); v.srcObject = s;
      $('visor-wrap').classList.add('activa');
      const p = v.play(); if (p && p.catch) p.catch(function () {});
      estado('Cámara activa (' + lente(m) + '). Vista previa local.', 'activa');
      return true;
    })
    .catch(function (e) { errorCamara(e); return false; })
    .finally(function () { ocupado = false; botones(); });
}
function alternar() { if (!stream) return; modo = modo === 'environment' ? 'user' : 'environment'; iniciar(modo); }
function apagar() { detener(); estado('Cámara apagada. El sensor quedó libre.', 'apagada'); }
function aviso(mostrar) { $('aviso-permiso').hidden = !mostrar; if (mostrar) $('btn-confirmar-permiso').focus(); }
function consultar() {
  if (!('permissions' in navigator) || !navigator.permissions.query) return Promise.resolve('prompt');
  return navigator.permissions.query({ name: 'camera' }).then(function (r) { return r.state; }).catch(function () { return 'prompt'; });
}
function alPulsar() {
  if (ocupado || consultando) return;
  consultando = true; botones();
  estado('Consultando el estado del permiso...', 'proceso');
  consultar().then(function (p) {
    if (p === 'denied') { estado('La cámara está bloqueada. Habilítala desde el candado del navegador.', 'error'); return; }
    if (p === 'granted' || marca()) { iniciar(modo); return; }
    aviso(true);
  }).catch(function () { if (marca()) iniciar(modo); else aviso(true); })
    .finally(function () { consultando = false; botones(); });
}
function confirmar() { marca(true); aviso(false); iniciar(modo); }
function cancelar() { aviso(false); estado('Cámara no encendida.', 'apagada'); }
function instalar() {
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; $('btn-instalar').hidden = false; });
  $('btn-instalar').addEventListener('click', function () {
    if (!deferred) return;
    deferred.prompt();
    if (!deferred.userChoice) { deferred = null; $('btn-instalar').hidden = true; return; }
    deferred.userChoice.then(function () { deferred = null; $('btn-instalar').hidden = true; }).catch(function () {});
  });
  window.addEventListener('appinstalled', function () { deferred = null; $('btn-instalar').hidden = true; });
}
function ios() {
  const ua = navigator.userAgent || '';
  const es = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (es && !window.navigator.standalone) { $('aviso-ios').hidden = false; $('btn-instalar').hidden = true; }
}
function iniciarApp() {
  estado('Lista para comenzar.', 'apagada'); botones();
  $('btn-preparar-camara').addEventListener('click', alPulsar);
  $('btn-confirmar-permiso').addEventListener('click', confirmar);
  $('btn-cancelar-permiso').addEventListener('click', cancelar);
  $('btn-alternar-camara').addEventListener('click', alternar);
  $('btn-apagar-camara').addEventListener('click', apagar);
  instalar(); ios();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(function () {});
}
document.addEventListener('DOMContentLoaded', iniciarApp);
