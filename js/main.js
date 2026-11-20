/* =========================================================
   Punto de entrada de la aplicación
   Persona A

   Solo reúne los elementos de la página, crea la interfaz y
   registra las opciones de la Parte B (recorridos, niveles y
   operaciones adicionales) en el menú.
   ========================================================= */

import { crearInterfaz } from "./ui.js";
import * as ParteB from "./ui-parteB.js"; // Parte B: exporta OPCIONES y ejecutar

const $ = (id) => document.getElementById(id);

const interfaz = crearInterfaz({
  svg: $("arbol"),
  lienzo: $("lienzo"),
  formulario: $("formulario"),
  entrada: $("valor"),
  mensaje: $("mensaje"),
  camino: $("camino"),
  menu: $("menu"),
  utilidades: $("utilidades"),
  resumen: $("resumen-arbol"),
  botonCancelar: $("btn-cancelar"),
  velocidad: $("velocidad"),
  textoVelocidad: $("velocidad-texto"),
  zoom: {
    acercar: $("zoom-acercar"),
    alejar: $("zoom-alejar"),
    ajustar: $("zoom-ajustar"),
    centrar: $("zoom-centrar"),
    texto: $("zoom-texto"),
  },
});

// Agrega los botones de la Parte B; sus resultados se animan con el
// animador compartido.
interfaz.registrarParteB(ParteB);

// Solo para las pruebas automáticas (index.html?pruebas): permite
// comparar el dibujo con el árbol lógico desde la consola.
if (new URLSearchParams(location.search).has("pruebas")) {
  window.visualizador = interfaz;
}
