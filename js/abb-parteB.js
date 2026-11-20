/* =========================================================
   ABB - Parte B: Recorridos, niveles y operaciones libres
   Autora: Paola Cardeña Koyoc (DSM 4A)

   Este módulo AGREGA métodos a la clase ABB de la Persona A
   (js/abb.js). Basta con importarlo una vez, por ejemplo en
   main.js, para que todos los árboles tengan estos métodos:
     import "./abb-parteB.js";

   Estructura que usa (definida en nodo.js y abb.js):
     Nodo { valor, izquierdo, derecho }
     ABB  { raiz }

   Todos los métodos DEVUELVEN datos (arreglos, números u
   objetos) y no usan el DOM; la interfaz decide cómo
   mostrarlos o animarlos.
   ========================================================= */

import { ABB } from "./abb.js";

// La raíz está en el nivel 1 (convención acordada en el README).
// Si el maestro la contara como nivel 0, solo hay que cambiar este valor.
export const NIVEL_RAIZ = 1;

/* ---------- 5. Recorrido en anchura (por niveles) ---------- */
// Usa una cola (FIFO): visita la raíz, luego sus hijos, luego los nietos...
// Cada nodo que sale de la cola mete a sus hijos al final de la cola.
ABB.prototype.recorridoAnchura = function () {
  const resultado = [];
  if (!this.raiz) return resultado;

  const cola = [this.raiz];
  while (cola.length > 0) {
    const actual = cola.shift();          // sacar el primero de la cola
    resultado.push(actual.valor);
    if (actual.izquierdo) cola.push(actual.izquierdo);
    if (actual.derecho) cola.push(actual.derecho);
  }
  return resultado;
};

/* ---------- 6. Recorrido en preorden (Raíz - Izq - Der) ---------- */
// Primero se visita el nodo y después sus subárboles izquierdo y derecho.
ABB.prototype.preorden = function () {
  const resultado = [];
  const recorrer = (nodo) => {
    if (!nodo) return;                    // caso base: subárbol vacío
    resultado.push(nodo.valor);
    recorrer(nodo.izquierdo);
    recorrer(nodo.derecho);
  };
  recorrer(this.raiz);
  return resultado;
};

/* ---------- 7. Recorrido en postorden (Izq - Der - Raíz) ---------- */
// Primero se visitan ambos subárboles y al final el nodo.
ABB.prototype.postorden = function () {
  const resultado = [];
  const recorrer = (nodo) => {
    if (!nodo) return;
    recorrer(nodo.izquierdo);
    recorrer(nodo.derecho);
    resultado.push(nodo.valor);
  };
  recorrer(this.raiz);
  return resultado;
};

/* ---------- 8. Recorrido en inorden (Izq - Raíz - Der) ---------- */
// En un ABB, el inorden siempre da los valores ordenados de menor a mayor.
ABB.prototype.inorden = function () {
  const resultado = [];
  const recorrer = (nodo) => {
    if (!nodo) return;
    recorrer(nodo.izquierdo);
    resultado.push(nodo.valor);
    recorrer(nodo.derecho);
  };
  recorrer(this.raiz);
  return resultado;
};

/* ---------- 9. Número de niveles del árbol ---------- */
// Árbol vacío = 0 niveles; solo la raíz = 1 nivel.
// Niveles de un nodo = 1 + el mayor número de niveles entre sus dos hijos.
ABB.prototype.numeroNiveles = function () {
  const contar = (nodo) => {
    if (!nodo) return 0;
    return 1 + Math.max(contar(nodo.izquierdo), contar(nodo.derecho));
  };
  return contar(this.raiz);
};

/* ---------- 10. Nivel de un nodo específico ---------- */
// Baja desde la raíz como en una búsqueda: si el valor es menor va a la
// izquierda, si es mayor a la derecha, y cuenta cuántos pasos dio.
// La raíz está en el nivel 1. Devuelve -1 si el valor no existe.
ABB.prototype.nivelDe = function (valor) {
  let actual = this.raiz;
  let nivel = NIVEL_RAIZ;
  while (actual) {
    if (valor === actual.valor) return nivel;
    actual = valor < actual.valor ? actual.izquierdo : actual.derecho;
    nivel++;
  }
  return -1;
};

/* =========================================================
   OPERACIONES LIBRES (3 de la Persona B)
   ========================================================= */

/* ---------- Libre 1: Contar nodos totales y nodos hoja ---------- */
// Recorre todo el árbol contando nodos. Una hoja es un nodo sin hijos;
// además de contarlas se guardan sus valores para poder resaltarlas.
ABB.prototype.contarNodosYHojas = function () {
  let total = 0;
  const hojas = [];
  const recorrer = (nodo) => {
    if (!nodo) return;
    total++;
    if (!nodo.izquierdo && !nodo.derecho) hojas.push(nodo.valor);
    recorrer(nodo.izquierdo);
    recorrer(nodo.derecho);
  };
  recorrer(this.raiz);
  return { totalNodos: total, totalHojas: hojas.length, hojas };
};

/* ---------- Libre 2: Suma de los valores ---------- */
// Recorre el árbol por niveles (reusa recorridoAnchura) y va acumulando
// los valores. También calcula el promedio. Árbol vacío: suma 0,
// cantidad 0 y promedio null (no se puede dividir entre 0).
ABB.prototype.sumaValores = function () {
  const valores = this.recorridoAnchura();
  let suma = 0;
  for (const v of valores) suma += v;
  const cantidad = valores.length;
  return {
    suma,
    cantidad,
    promedio: cantidad === 0 ? null : suma / cantidad,
    valores,                              // en el orden en que se sumaron
  };
};

/* ---------- Libre 3: Camino de la raíz a un nodo ---------- */
// Devuelve los valores visitados desde la raíz hasta el nodo buscado
// (sirve para resaltarlos en el dibujo). Devuelve null si no existe.
ABB.prototype.caminoA = function (valor) {
  const camino = [];
  let actual = this.raiz;
  while (actual) {
    camino.push(actual.valor);
    if (valor === actual.valor) return camino;
    actual = valor < actual.valor ? actual.izquierdo : actual.derecho;
  }
  return null;
};
