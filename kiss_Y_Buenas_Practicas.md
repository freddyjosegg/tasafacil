# Filosofía de Desarrollo y Buenas Prácticas - TasaFácil

Este documento define las directrices obligatorias de diseño de software, codificación y documentación para mantener la resiliencia, velocidad y naturaleza offline-first de la aplicación de calculadora y presupuestos TasaFácil.

---

## 1. Filosofía KISS (Keep It Simple, Stupid)
En este proyecto, la simplicidad y el uso de tecnologías nativas son los pilares fundamentales para garantizar la estabilidad offline y la máxima velocidad en cualquier dispositivo.

* **Vanilla Stack Nativo:** La aplicación está construida usando únicamente HTML5, CSS3 y JavaScript moderno nativo (ES6+). Está prohibido introducir frameworks de frontend pesados (React, Vue, etc.) o librerías de estilos adicionales.
* **Cero dependencias externas complejas:** Si una funcionalidad se puede programar en JavaScript nativo, se hace nativo (por ejemplo, exportar a CSV, formatear monedas, manejar eventos, etc.).
* **Mantener la robustez ante fallos:** La lógica debe estar preparada para fallas de red. Al obtener las tasas oficiales o paralelas desde el API externa (`ve.dolarapi.com`), siempre se debe envolver en bloques `try/catch` y proveer un estado de fallback amigable sin bloquear el resto de la aplicación (como el presupuesto y los cálculos locales).

---

## 2. Buenas Prácticas de Estructura e Integridad Offline (Local-First)

### 🎨 CSS y HTML Desacoplados
* **Separación de la presentación:** Todo el estilo visual debe residir exclusivamente en [assets/styles.css](file:///home/fred/Documentos/tasafacil/assets/styles.css). Está prohibido declarar estilos inline (`style="..."`) o incrustar bloques `<style>` dentro de [index.html](file:///home/fred/Documentos/tasafacil/index.html).
* **Tipografías Premium:** Para mantener la estética elegante de la app, se importan y emplean las fuentes de Google Fonts `Outfit` (para títulos y encabezados principales) e `Inter` (para cuerpos de texto, números y formularios).

### ☀️ Sistema de Tres Temas y Estética Premium
* **Configuración por Variables CSS:** Los colores, bordes y sombras se gestionan de forma centralizada en el stylesheet usando CSS Custom Properties (Variables CSS).
* **Temas Soportados:** Claro ☀️, Oscuro 🌙 y Premium (Negro/Oro) 👑.
* **Lógica del Selector de Temas:** El botón `#theme-toggle` rota de manera circular entre los tres temas. Si el usuario no ha elegido manualmente un tema, la aplicación se adapta en tiempo real a la preferencia del sistema operativo del usuario (`prefers-color-scheme`).

### 📈 Integración de Multi-Tasas y Símbolos Dinámicos
* **Múltiples Tasas de Referencia:** El selector `#rate-selector` permite al usuario alternar entre Dólar Oficial (BCV), Dólar Paralelo, Euro Oficial (BCV) y Euro Paralelo mediante endpoints dedicados en `ve.dolarapi.com`.
* **Interfaz Adaptativa:** Al cambiar la tasa de referencia, el sistema debe actualizar dinámicamente:
  - Los códigos de moneda (`USD` / `EUR`) y los símbolos correspondientes (`$` / `€`) en todas las etiquetas de formulario y resultados.
  - La visualización de las opciones en la calculadora rápida y los campos de registro.
  - El balance restante y los cálculos de transacciones históricas en bolívares.
* **Consistencia en Datos:** Las transacciones se almacenan localmente utilizando una clave genérica de referencia (`amountInRef`). Al cambiar de tipo de moneda o de tasa, el sistema debe recalcular los valores equivalentes en caliente para garantizar la coherencia presupuestaria.

### ⚡ JavaScript e Interacción con el DOM
* **Prohibición de JS Inline:** Los elementos interactivos no deben declarar atributos de eventos inline en el HTML (como `onclick`, `onchange` u `oninput`). Toda la vinculación de eventos interactivos debe realizarse de forma centralizada en [app.js](file:///home/fred/Documentos/tasafacil/app.js) usando `addEventListener()`.
* **No polución del scope global:** Evitar registrar funciones o variables en el objeto global `window` para mantener el código modular y limpio.
* **Persistencia local:** Las preferencias de temas y tipo de tasa se guardan en `localStorage` (`tasafacil_theme` y `tasafacil_rate_type`).

### 🏷️ Versionado Semántico y PWA Cache
* **Formato de Versionado:** Se adopta el estándar de versionado semántico `x.x.x` (como `1.1.0`) en [package.json](file:///home/fred/Documentos/tasafacil/package.json).
* **Control de Versión de Caché:** Al realizar cambios en el código o estilos, se debe incrementar el identificador `CACHE_NAME` en [sw.js](file:///home/fred/Documentos/tasafacil/sw.js) siguiendo el formato del proyecto (ej: `tasafacil-v1.1.0`). Esto asegura la descarga atómica e inmediata de la actualización por parte del navegador.

---

## 3. Formateo de Datos y Localización

* **Formateo Regional:** Utilizar la API nativa `Intl.NumberFormat` con localización `es-VE` para el formateo de monedas. Esto garantiza que las cifras se muestren correctamente empleando comas como decimales y puntos como separadores de miles.
* **Exportaciones Compatibles:** Al generar la exportación a formato Excel/CSV, siempre se debe inyectar la Marca de Orden de Bytes (BOM) UTF-8 (`\uFEFF`) al inicio del archivo. Esto asegura que caracteres del español como tildes y eñes se importen sin problemas en programas de hojas de cálculo de escritorio.