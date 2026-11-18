/* =========================================================
   Punto de entrada de la aplicación
   Persona A

   Crea el árbol, conecta los controles y redibuja el SVG
   después de cada modificación.

   NOTA: los controles de este archivo son PROVISIONALES, solo
   para probar la representación gráfica. En la fase 3 pasan a
   js/ui.js junto con las animaciones y el menú completo.
   ========================================================= */

import { ABB, VALOR_MINIMO, VALOR_MAXIMO } from "./abb.js";
import { dibujarArbol, centrarEnRaiz } from "./arbol-svg.js";

const EJEMPLO = [50, 30, 70, 20, 40, 60, 80, 35, 45, 65];

let arbol = new ABB();

const svg = document.getElementById("arbol");
const lienzo = svg.parentElement; // contenedor con barras de desplazamiento
const formulario = document.getElementById("formulario");
const entrada = document.getElementById("valor");
const mensaje = document.getElementById("mensaje");

// El <input> entrega texto. Un campo vacío se trata como inválido
// (Number("") daría 0). La validación final la hace el ABB.
function leerValor() {
  const texto = entrada.value.trim();
  return texto === "" ? NaN : Number(texto);
}

function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`;
}

const TEXTO_INVALIDO = `Escribe un número entero entre ${VALOR_MINIMO} y ${VALOR_MAXIMO}.`;

// centrar = true al cargar un árbol nuevo: lleva la vista a la raíz.
// En inserciones y eliminaciones se respeta el desplazamiento del usuario.
function redibujar(centrar = false) {
  const disposicion = dibujarArbol(svg, arbol);
  if (centrar) centrarEnRaiz(lienzo, svg, disposicion);
}

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const valor = leerValor();
  const r = arbol.insertar(valor);
  if (r.insertado) {
    mostrarMensaje(`Se insertó el ${valor}.`, "exito");
    redibujar();
  } else if (r.motivo === "duplicado") {
    mostrarMensaje(`El ${valor} ya está en el árbol (no se permiten duplicados).`, "error");
  } else {
    mostrarMensaje(TEXTO_INVALIDO, "error");
  }
  entrada.select();
});

document.getElementById("btn-eliminar").addEventListener("click", () => {
  const valor = leerValor();
  const r = arbol.eliminar(valor);
  if (r.eliminado) {
    const casos = { hoja: "era una hoja", unHijo: "tenía un hijo", dosHijos: `tenía dos hijos; lo reemplaza su sucesor ${r.reemplazo}` };
    mostrarMensaje(`Se eliminó el ${valor} (${casos[r.caso]}).`, "exito");
    redibujar();
  } else if (r.motivo === "inexistente") {
    mostrarMensaje(`El ${valor} no está en el árbol.`, "error");
  } else {
    mostrarMensaje(TEXTO_INVALIDO, "error");
  }
});

document.getElementById("btn-ejemplo").addEventListener("click", () => {
  arbol = new ABB();
  EJEMPLO.forEach((v) => arbol.insertar(v));
  mostrarMensaje("Se cargó el árbol de ejemplo.", "exito");
  redibujar(true);
});

document.getElementById("btn-vaciar").addEventListener("click", () => {
  arbol = new ABB();
  mostrarMensaje("El árbol se vació.", "exito");
  redibujar();
});

redibujar();
