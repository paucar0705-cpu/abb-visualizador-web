/* =========================================================
   Árbol Binario de Búsqueda (ABB)
   Persona A: insertar, buscar, eliminar, mínimo y máximo.

   Este archivo contiene SOLO la lógica de la estructura de datos.
   No usa el DOM: cada método devuelve datos y la interfaz decide
   cómo mostrarlos o animarlos.

   Propiedad del ABB: para cada nodo, todos los valores de su
   subárbol izquierdo son menores y todos los de su subárbol
   derecho son mayores. No se permiten duplicados.

   ---------------------------------------------------------
   CAMINO RECORRIDO
   ---------------------------------------------------------
   Los métodos insertar, buscar y eliminar devuelven `camino`:
   un arreglo con los VALORES de los nodos YA EXISTENTES que se
   compararon, en orden, empezando por la raíz.
     - insertar: termina en el nodo que será el padre del nuevo
       (el valor nuevo NO se incluye). Si el árbol estaba vacío,
       el camino es []. Si es duplicado, termina en el nodo igual.
     - buscar: termina en el nodo encontrado o, si no existe,
       en el último nodo comparado antes de llegar a null.
     - eliminar: termina en el nodo eliminado o, si no existe,
       en el último nodo comparado.
   Si el valor es inválido no se recorre nada: camino = [].

   ---------------------------------------------------------
   OPERACIONES FALLIDAS
   ---------------------------------------------------------
   Ningún método lanza excepciones por datos del usuario. Cada
   resultado incluye `motivo`:
     null           -> la operación tuvo éxito
     "invalido"     -> no es un entero entre -999 y 999
     "duplicado"    -> (insertar) el valor ya existe
     "inexistente"  -> (buscar / eliminar) el valor no está
   El árbol NUNCA se modifica cuando una operación falla.
   ========================================================= */

import { Nodo } from "./nodo.js";

export const VALOR_MINIMO = -999;
export const VALOR_MAXIMO = 999;

// Un valor es válido si es de tipo number, entero y está en el rango.
// Ojo: el texto "10" NO es válido; la interfaz debe convertirlo antes.
export function esValorValido(valor) {
  return Number.isInteger(valor) && valor >= VALOR_MINIMO && valor <= VALOR_MAXIMO;
}

export class ABB {
  constructor() {
    this.raiz = null; // árbol vacío
  }

  // true si el árbol no tiene nodos.
  estaVacio() {
    return this.raiz === null;
  }

  /* ---------- Insertar ----------
     Baja desde la raíz: si el valor es menor va a la izquierda,
     si es mayor a la derecha. Donde encuentre un hueco (null),
     coloca el nodo nuevo.
     Devuelve { insertado, camino, motivo }. */
  insertar(valor) {
    if (!esValorValido(valor)) {
      return { insertado: false, camino: [], motivo: "invalido" };
    }

    const camino = [];
    if (this.estaVacio()) {
      this.raiz = new Nodo(valor);
      return { insertado: true, camino, motivo: null };
    }

    let actual = this.raiz;
    while (true) {
      camino.push(actual.valor);

      if (valor === actual.valor) {
        return { insertado: false, camino, motivo: "duplicado" };
      }

      if (valor < actual.valor) {
        if (actual.izquierdo === null) {
          actual.izquierdo = new Nodo(valor);
          return { insertado: true, camino, motivo: null };
        }
        actual = actual.izquierdo;
      } else {
        if (actual.derecho === null) {
          actual.derecho = new Nodo(valor);
          return { insertado: true, camino, motivo: null };
        }
        actual = actual.derecho;
      }
    }
  }

  /* ---------- Buscar ----------
     Mismo descenso que insertar, pero sin modificar nada.
     Devuelve { encontrado, camino, motivo }. */
  buscar(valor) {
    if (!esValorValido(valor)) {
      return { encontrado: false, camino: [], motivo: "invalido" };
    }

    const camino = [];
    let actual = this.raiz;
    while (actual !== null) {
      camino.push(actual.valor);
      if (valor === actual.valor) {
        return { encontrado: true, camino, motivo: null };
      }
      actual = valor < actual.valor ? actual.izquierdo : actual.derecho;
    }
    return { encontrado: false, camino, motivo: "inexistente" };
  }

  /* ---------- Mínimo y máximo (operaciones libres de A) ----------
     El mínimo es el nodo más a la izquierda y el máximo el más
     a la derecha. Devuelven null si el árbol está vacío. */
  minimo() {
    if (this.estaVacio()) return null;
    let actual = this.raiz;
    while (actual.izquierdo !== null) actual = actual.izquierdo;
    return actual.valor;
  }

  maximo() {
    if (this.estaVacio()) return null;
    let actual = this.raiz;
    while (actual.derecho !== null) actual = actual.derecho;
    return actual.valor;
  }

  /* ---------- Eliminar ----------
     1) Se busca el nodo guardando también a su padre.
     2) Según cuántos hijos tenga:
        - hoja:     su padre apunta a null.
        - unHijo:   su padre apunta directamente a ese hijo.
        - dosHijos: se busca el SUCESOR INORDEN (el menor del
          subárbol derecho), se copia su valor en el nodo y se
          elimina el sucesor, que nunca tiene hijo izquierdo
          (por eso su eliminación siempre es caso hoja o unHijo).
     Devuelve { eliminado, caso, camino, reemplazo, motivo }:
        caso:      "hoja" | "unHijo" | "dosHijos" | null (si falló)
        reemplazo: valor que ocupa el lugar del eliminado:
                   null en "hoja", el valor del hijo que sube en
                   "unHijo" y el valor del sucesor en "dosHijos". */
  eliminar(valor) {
    if (!esValorValido(valor)) {
      return { eliminado: false, caso: null, camino: [], reemplazo: null, motivo: "invalido" };
    }

    // 1) Buscar el nodo y su padre
    const camino = [];
    let padre = null;
    let actual = this.raiz;
    while (actual !== null && actual.valor !== valor) {
      camino.push(actual.valor);
      padre = actual;
      actual = valor < actual.valor ? actual.izquierdo : actual.derecho;
    }

    if (actual === null) {
      return { eliminado: false, caso: null, camino, reemplazo: null, motivo: "inexistente" };
    }
    camino.push(actual.valor);

    // 2a) Dos hijos: se reemplaza por el sucesor inorden
    if (actual.izquierdo !== null && actual.derecho !== null) {
      let padreSucesor = actual;
      let sucesor = actual.derecho;
      while (sucesor.izquierdo !== null) {
        padreSucesor = sucesor;
        sucesor = sucesor.izquierdo;
      }
      actual.valor = sucesor.valor;
      // El sucesor no tiene hijo izquierdo: su hijo derecho (o null) toma su lugar
      this.reemplazarHijo(padreSucesor, sucesor, sucesor.derecho);
      return { eliminado: true, caso: "dosHijos", camino, reemplazo: actual.valor, motivo: null };
    }

    // 2b) Hoja o un solo hijo: el hijo (o null) toma el lugar del nodo
    const hijo = actual.izquierdo !== null ? actual.izquierdo : actual.derecho;
    this.reemplazarHijo(padre, actual, hijo);

    if (hijo === null) {
      return { eliminado: true, caso: "hoja", camino, reemplazo: null, motivo: null };
    }
    return { eliminado: true, caso: "unHijo", camino, reemplazo: hijo.valor, motivo: null };
  }

  // Auxiliar de eliminar: hace que `padre` apunte a `nuevo` en lugar de `viejo`.
  // Si `padre` es null, `viejo` era la raíz.
  reemplazarHijo(padre, viejo, nuevo) {
    if (padre === null) {
      this.raiz = nuevo;
    } else if (padre.izquierdo === viejo) {
      padre.izquierdo = nuevo;
    } else {
      padre.derecho = nuevo;
    }
  }
}
