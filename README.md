# pwa-camara-instalable

PWA instalable con acceso ético a la cámara frontal y trasera.

Materia: Desarrollo de Aplicaciones Web Progresivas (PWA)
Temas: 6.1 Instalabilidad nativa (manifest.json) y 6.2 Acceso ético a cámara.

## Restricciones que cumple

- JavaScript 100% vanilla, sin librerías.
- Sin async/await: toda la asincronía usa `.then()`, `.catch()` y `.finally()`.
- Rutas relativas (`./`) para GitHub Pages.
- HTTPS mediante GitHub Pages.
- Revisión en teléfono móvil.

## Estructura

```
pwa-camara-instalable/
├── index.html
├── styles.css
├── app.js
├── sw.js
├── manifest.json
└── icons/
    ├── icon.svg
    ├── icon-192.png   (192x192 exactos)
    └── icon-512.png   (512x512 exactos)
```

## Flujo de pre-permiso

1. El usuario pulsa "Encender cámara": solo aparece una tarjeta explicativa.
2. La cámara aún no se enciende.
3. El usuario pulsa "Entendido, encender": se solicita el permiso nativo.
4. Si acepta, se muestra la vista previa local.
5. "Girar" detiene el stream actual y enciende el otro lente.
6. "Apagar" ejecuta `track.stop()` en todas las pistas y limpia el video.

## Instalación

- Android/Chrome/Edge: aparece el botón "Instalar" al recibir `beforeinstallprompt`.
- iPhone/iPad: Safari no dispara ese evento. La app muestra los pasos manuales
  (Compartir → Agregar a inicio) cuando detecta iOS y no está instalada.

## Pruebas

1. Enviar la app por HTTPS y abrirla en el teléfono.
2. Instalarla y comprobar que abre en modo standalone.
3. Encender la cámara y verificar que el aviso aparece antes del diálogo nativo.
4. Alternar entre cámara trasera y frontal.
5. Apagar y confirmar que el indicador de cámara del teléfono se apaga.

## Notas técnicas

- `playsinline` y `muted` evitan que iOS abra el video en pantalla completa.
- `facingMode` se envía como preferencia (`ideal`) para no fallar en equipos
  que no tienen el lente solicitado.
- La cámara se libera también al pasar la app a segundo plano.
- Los iconos son PNG reales de 192x192 y 512x512; no se renombran imágenes.
