/* =========================================================
   Punto de entrada de la aplicación
   Persona A

   Solo reúne los elementos de la página y crea la interfaz.
   La Parte B se integrará aquí con dos líneas:
     import * as ParteB from "./ui-parteB.js";   // exporta OPCIONES y ejecutar
     interfaz.registrarParteB(ParteB);
   ========================================================= */

import { crearInterfaz } from "./ui.js";

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

// Solo para las pruebas automáticas (index.html?pruebas): permite
// comparar el dibujo con el árbol lógico desde la consola.
if (new URLSearchParams(location.search).has("pruebas")) {
  window.visualizador = interfaz;
}
