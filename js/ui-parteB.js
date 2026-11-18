/* =========================================================
   ABB - Parte B: opciones del menú y animación de nodos
   Autora: Paola Cardeña Koyoc (DSM 4A)

   Módulo que conecta mis operaciones con la interfaz de L.
   No dibuja el árbol: usa el dibujo SVG de la Persona A.

   Contrato visual (README):
     - Cada nodo dibujado es <g class="nodo" data-valor="X">…</g>
     - Mientras se anima, el nodo lleva la clase "nodo-activo";
       al pasar al siguiente queda con "nodo-visitado".

   Uso desde ui.js:
     import { OPCIONES, ejecutar, animar } from "./ui-parteB.js";
     const r = ejecutar("preorden", arbol);
     mostrarMensaje(r.texto);   // función de L
     animar(r.nodos);           // ilumina los nodos en orden

   Nota: cuando exista js/animacion.js (animador compartido),
   animar() se cambiará para usarlo; ejecutar() no cambia.
   ========================================================= */

import { esValorValido, VALOR_MINIMO, VALOR_MAXIMO } from "./abb.js";
import "./abb-parteB.js"; // agrega mis métodos a ABB.prototype

/* ---------- Opciones de la Parte B para el menú ---------- */
// Nombre real de cada opción. pideValor = true si necesita un número.
export const OPCIONES = [
  { id: "anchura",   numero: 5,  nombre: "Recorrido en anchura (por niveles)", pideValor: false },
  { id: "preorden",  numero: 6,  nombre: "Recorrido en preorden",              pideValor: false },
  { id: "postorden", numero: 7,  nombre: "Recorrido en postorden",             pideValor: false },
  { id: "inorden",   numero: 8,  nombre: "Recorrido en inorden",               pideValor: false },
  { id: "niveles",   numero: 9,  nombre: "Número de niveles del árbol",        pideValor: false },
  { id: "nivelDe",   numero: 10, nombre: "Nivel de un nodo",                   pideValor: true  },
  { id: "contar",    numero: 11, nombre: "Contar nodos y hojas",               pideValor: false },
  { id: "suma",      numero: 12, nombre: "Suma de los valores",                pideValor: false },
  { id: "camino",    numero: 13, nombre: "Camino de la raíz a un nodo",        pideValor: true  },
];

/* ---------- Ejecutar una opción ---------- */
// Devuelve { ok, texto, nodos }:
//   ok    -> false si hubo un error (árbol vacío, valor inválido, no existe)
//   texto -> mensaje para mostrar al usuario
//   nodos -> valores a iluminar, en orden (puede ir vacío)
export function ejecutar(id, arbol, valor) {
  if (!arbol || arbol.estaVacio()) {
    return { ok: false, texto: "El árbol está vacío. Inserta elementos primero.", nodos: [] };
  }

  // Opciones que necesitan un valor: se convierte el texto del <input>
  // a número y se valida con la misma regla que usa el ABB.
  let v = null;
  const opcion = OPCIONES.find((o) => o.id === id);
  if (opcion && opcion.pideValor) {
    v = aEntero(valor);
    if (v === null) {
      return { ok: false, texto: `Escribe un entero entre ${VALOR_MINIMO} y ${VALOR_MAXIMO}.`, nodos: [] };
    }
  }

  switch (id) {
    case "anchura":   return recorrido("Anchura", arbol.recorridoAnchura());
    case "preorden":  return recorrido("Preorden", arbol.preorden());
    case "postorden": return recorrido("Postorden", arbol.postorden());
    case "inorden":   return recorrido("Inorden", arbol.inorden());

    case "niveles": {
      const n = arbol.numeroNiveles();
      return {
        ok: true,
        texto: `El árbol tiene ${n} nivel${n === 1 ? "" : "es"}.`,
        nodos: arbol.recorridoAnchura(), // se ilumina nivel por nivel
      };
    }

    case "nivelDe": {
      const nivel = arbol.nivelDe(v);
      if (nivel === -1) return { ok: false, texto: `El ${v} no está en el árbol.`, nodos: [] };
      return { ok: true, texto: `El nodo ${v} está en el nivel ${nivel}.`, nodos: arbol.caminoA(v) };
    }

    case "contar": {
      const r = arbol.contarNodosYHojas();
      return {
        ok: true,
        texto: `Nodos totales: ${r.totalNodos}   ·   Hojas: ${r.totalHojas} (${r.hojas.join(", ")})`,
        nodos: r.hojas,
      };
    }

    case "suma": {
      const r = arbol.sumaValores();
      const promedio = Number.isInteger(r.promedio) ? r.promedio : r.promedio.toFixed(2);
      return {
        ok: true,
        texto: `Suma: ${r.valores.join(" + ")} = ${r.suma}   ·   Promedio: ${promedio}`,
        nodos: r.valores,
      };
    }

    case "camino": {
      const r = arbol.caminoA(v);
      if (!r) return { ok: false, texto: `El ${v} no está en el árbol.`, nodos: [] };
      return { ok: true, texto: "Camino: " + r.join(" → "), nodos: r };
    }

    default:
      return { ok: false, texto: "Opción desconocida: " + id, nodos: [] };
  }
}

// Resultado común de los cuatro recorridos
function recorrido(nombre, valores) {
  return { ok: true, texto: `${nombre}: ${valores.join(" → ")}`, nodos: valores };
}

// Convierte lo escrito en el <input> ("35") a número y lo valida.
// Devuelve null si no es un entero entre -999 y 999.
function aEntero(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === "") return null;
  const n = Number(valor);
  return esValorValido(n) ? n : null;
}

/* ---------- Animación de nodos ---------- */
let velocidad = 700;        // milisegundos que dura iluminado cada nodo
let animacionActual = 0;    // sirve para cancelar una animación anterior

export function setVelocidad(ms) {
  velocidad = ms;
}

// Busca el elemento dibujado de un nodo por su valor
function elementoDe(valor) {
  return document.querySelector(`.nodo[data-valor="${CSS.escape(String(valor))}"]`);
}

// Quita las clases de animación de todos los nodos y cancela la animación en curso
export function limpiar() {
  animacionActual++;
  document.querySelectorAll(".nodo-activo, .nodo-visitado").forEach((el) =>
    el.classList.remove("nodo-activo", "nodo-visitado")
  );
}

// Ilumina los nodos uno por uno, en el orden del arreglo recibido.
// Devuelve una promesa que termina cuando acaba la animación.
export async function animar(valores, ms = velocidad) {
  limpiar();
  const id = animacionActual;
  const espera = (t) => new Promise((ok) => setTimeout(ok, t));
  for (const v of valores) {
    if (id !== animacionActual) return;   // otra animación la canceló
    const el = elementoDe(v);
    if (el) el.classList.add("nodo-activo");
    await espera(ms);
    if (el) el.classList.replace("nodo-activo", "nodo-visitado");
  }
}
