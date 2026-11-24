/*
 * app.js
 * Instalabilidad, pre-permiso ético y control de cámara frontal/trasera.
 *
 * Restricciones del curso: JavaScript vanilla, sin librerías y sin
 * async/await. Toda la asincronía se resuelve con .then(), .catch() y
 * .finally().
 */

'use strict';

const MENSAJE_INICIAL = 'Lista para comenzar.';

let streamActual = null;
let modoCamaraActual = 'environment'; // 'environment' = trasera | 'user' = frontal
let eventoInstalacionDiferido = null;
let camaraEnProceso = false;

/* --------------------------------------------------------------- utilidades */

function $(id) {
  return document.getElementById(id);
}

function nombreLente(modo) {
  return modo === 'environment' ? 'trasera' : 'frontal';
}

function anotar(mensaje) {
  const lista = $('bitacora');
  if (!lista) {
    return;
  }

  const item = document.createElement('li');
  const ahora = new Date();

  item.textContent = ('0' + ahora.getHours()).slice(-2) + ':' +
    ('0' + ahora.getMinutes()).slice(-2) + ':' +
    ('0' + ahora.getSeconds()).slice(-2) + '  ' + mensaje;

  lista.insertBefore(item, lista.firstChild);

  const ultimo = $('ultimo-aviso');
  if (ultimo) {
    ultimo.textContent = mensaje;
  }

  while (lista.children.length > 40) {
    lista.removeChild(lista.lastChild);
  }
}

/**
 * Cambia el mensaje visible y el color de los indicadores.
 * tipo: 'apagada' | 'proceso' | 'activa' | 'error'
 */
function actualizarEstado(mensaje, tipo) {
  const texto = $('mensaje-estado');
  if (texto) {
    texto.textContent = mensaje;
  }

  const clase = tipo === 'activa' ? 'dot online'
    : tipo === 'error' ? 'dot offline'
      : 'dot';

  const badge = $('badge-camara');
  if (badge) {
    badge.className = clase;
    badge.title = mensaje;
    badge.setAttribute('aria-label', mensaje);
  }

  const punto = $('punto-estado');
  if (punto) {
    punto.className = clase;
  }
}

function actualizarBotones() {
  const activa = !!streamActual;

  const preparar = $('btn-preparar-camara');
  if (preparar) {
    preparar.disabled = activa || camaraEnProceso;
    const texto = $('texto-preparar');
    if (texto) {
      texto.textContent = 'Encender cámara ' + nombreLente(modoCamaraActual);
    }
  }

  const alternar = $('btn-alternar-camara');
  if (alternar) {
    alternar.disabled = !activa || camaraEnProceso;
  }

  const apagar = $('btn-apagar-camara');
  if (apagar) {
    apagar.disabled = !activa;
  }
}

/* ------------------------------------------------------------------ cámara */

/**
 * Libera el hardware. Es obligatorio antes de pedir otro lente: el sistema
 * no permite abrir la frontal mientras la trasera sigue transmitiendo.
 */
function detenerCamaraActiva() {
  if (streamActual) {
    streamActual.getTracks().forEach(function (track) {
      track.stop();
    });
    streamActual = null;
  }

  const visor = $('visor-camara');
  if (visor) {
    visor.srcObject = null;
  }

  const contenedor = $('visor-wrap');
  if (contenedor) {
    contenedor.classList.remove('activa');
  }

  actualizarBotones();
}

function clasificarErrorCamara(error) {
  let mensaje;

  if (!error || !error.name) {
    mensaje = 'No se pudo acceder a la cámara.';
  } else if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
    mensaje = 'Permiso denegado. Habilita la cámara para este sitio en los ajustes de tu navegador.';
  } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
    mensaje = 'No se detectó ninguna cámara en este dispositivo.';
  } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
    mensaje = 'La cámara está ocupada por otra aplicación.';
  } else if (error.name === 'OverconstrainedError') {
    mensaje = 'Este dispositivo no tiene el lente solicitado.';
  } else {
    mensaje = 'Error al acceder al hardware: ' + error.message;
  }

  actualizarEstado(mensaje, 'error');
  anotar(mensaje);
}

/**
 * Enciende la cámara solicitada. Siempre detiene el stream anterior.
 * Devuelve una promesa que resuelve a true o false.
 */
function iniciarCamara(modo) {
  if (camaraEnProceso) {
    return Promise.resolve(false);
  }

  camaraEnProceso = true;
  actualizarBotones();
  actualizarEstado('Solicitando permiso y encendiendo cámara ' + nombreLente(modo) + '...', 'proceso');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    camaraEnProceso = false;
    actualizarBotones();
    const mensaje = 'Este navegador no soporta acceso a cámara. Usa HTTPS y un navegador moderno.';
    actualizarEstado(mensaje, 'error');
    anotar(mensaje);
    return Promise.resolve(false);
  }

  detenerCamaraActiva();

  const restricciones = {
    video: { facingMode: { ideal: modo } },
    audio: false
  };

  return navigator.mediaDevices.getUserMedia(restricciones)
    .then(function (stream) {
      streamActual = stream;

      const visor = $('visor-camara');
      visor.srcObject = stream;

      const contenedor = $('visor-wrap');
      if (contenedor) {
        contenedor.classList.add('activa');
      }

      const reproduccion = visor.play();
      if (reproduccion && reproduccion.catch) {
        reproduccion.catch(function () {
          // autoplay bloqueado: el atributo playsinline y muted lo evitan.
        });
      }

      actualizarEstado('Cámara activa (' + nombreLente(modo) + '). Vista previa local.', 'activa');
      anotar('Cámara encendida: lente ' + nombreLente(modo) + '.');
      return true;
    })
    .catch(function (error) {
      clasificarErrorCamara(error);
      return false;
    })
    .finally(function () {
      camaraEnProceso = false;
      actualizarBotones();
    });
}

function alternarCamara() {
  if (!streamActual) {
    anotar('Enciende la cámara antes de alternar.');
    return;
  }

  modoCamaraActual = modoCamaraActual === 'environment' ? 'user' : 'environment';
  anotar('Cambiando a cámara ' + nombreLente(modoCamaraActual) + '...');
  iniciarCamara(modoCamaraActual);
}

function apagarCamara() {
  detenerCamaraActiva();
  actualizarEstado('Cámara apagada. El sensor quedó libre.', 'apagada');
  anotar('Cámara apagada y tracks liberados.');
}

function mostrarAvisoPermiso() {
  const aviso = $('aviso-permiso');
  const texto = $('aviso-camara');

  if (texto) {
    texto.textContent = 'Se encenderá la cámara ' + nombreLente(modoCamaraActual) +
      ' y verás la vista previa en esta pantalla.';
  }

  if (aviso) {
    aviso.hidden = false;
    const confirmar = $('btn-confirmar-permiso');
    if (confirmar) {
      confirmar.focus();
    }
    if (aviso.scrollIntoView) {
      aviso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  anotar('Aviso de pre-permiso mostrado. La cámara aún no se ha encendido.');
}

function ocultarAvisoPermiso() {
  const aviso = $('aviso-permiso');
  if (aviso) {
    aviso.hidden = true;
  }
}

/* ------------------------------------------------------------ instalación */

function manejarInstalacion() {
  const boton = $('btn-instalar');

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    eventoInstalacionDiferido = event;

    if (boton) {
      boton.hidden = false;
    }

    anotar('Instalación disponible: botón habilitado.');
  });

  if (boton) {
    boton.addEventListener('click', function () {
      if (!eventoInstalacionDiferido) {
        return;
      }

      eventoInstalacionDiferido.prompt();

      if (!eventoInstalacionDiferido.userChoice) {
        boton.hidden = true;
        eventoInstalacionDiferido = null;
        return;
      }

      eventoInstalacionDiferido.userChoice
        .then(function (resultado) {
          anotar(resultado.outcome === 'accepted'
            ? 'Instalación aceptada por el usuario.'
            : 'Instalación cancelada por el usuario.');
          eventoInstalacionDiferido = null;
          boton.hidden = true;
        })
        .catch(function (error) {
          anotar('No se pudo completar la instalación: ' + error.message);
        });
    });
  }

  window.addEventListener('appinstalled', function () {
    if (boton) {
      boton.hidden = true;
    }
    eventoInstalacionDiferido = null;
    anotar('Aplicación instalada en el dispositivo.');
  });
}

function detectarIOS() {
  const ua = navigator.userAgent || '';
  const esIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const instalada = window.navigator.standalone === true;

  if (esIOS && !instalada) {
    const aviso = $('aviso-ios');
    if (aviso) {
      aviso.hidden = false;
    }

    const boton = $('btn-instalar');
    if (boton) {
      boton.hidden = true;
    }

    anotar('iOS detectado: instalación manual por Compartir > Agregar a inicio.');
  }

  return { esIOS: esIOS, instalada: instalada };
}

/* --------------------------------------------------------------- ciclo de vida */

function manejarVisibilidad() {
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && streamActual) {
      apagarCamara();
      anotar('App en segundo plano: cámara liberada por privacidad.');
    }
  });

  window.addEventListener('pagehide', function () {
    if (streamActual) {
      detenerCamaraActiva();
    }
  });
}

/* ------------------------------------------------------------ service worker */

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    anotar('Este navegador no soporta Service Workers.');
    return;
  }

  navigator.serviceWorker.register('./sw.js')
    .then(function (registro) {
      anotar('Service Worker registrado (alcance: ' + registro.scope + ').');
    })
    .catch(function (error) {
      anotar('Fallo al registrar el Service Worker: ' + error.message);
    });
}

/* ------------------------------------------------------------------ inicio */

function iniciar() {
  actualizarEstado(MENSAJE_INICIAL, 'apagada');
  actualizarBotones();

  const preparar = $('btn-preparar-camara');
  if (preparar) {
    preparar.addEventListener('click', mostrarAvisoPermiso);
  }

  const confirmar = $('btn-confirmar-permiso');
  if (confirmar) {
    confirmar.addEventListener('click', function () {
      ocultarAvisoPermiso();
      iniciarCamara(modoCamaraActual);
    });
  }

  const cancelar = $('btn-cancelar-permiso');
  if (cancelar) {
    cancelar.addEventListener('click', function () {
      ocultarAvisoPermiso();
      actualizarEstado('Cámara no encendida.', 'apagada');
      anotar('El usuario canceló el encendido de la cámara.');
    });
  }

  const alternar = $('btn-alternar-camara');
  if (alternar) {
    alternar.addEventListener('click', alternarCamara);
  }

  const apagar = $('btn-apagar-camara');
  if (apagar) {
    apagar.addEventListener('click', apagarCamara);
  }

  manejarInstalacion();
  detectarIOS();
  manejarVisibilidad();
  registrarServiceWorker();

  anotar('Aplicación lista. Vista previa local, sin envío de imágenes.');
}

document.addEventListener('DOMContentLoaded', iniciar);
