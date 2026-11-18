/* =========================================================
   Nodo de un Árbol Binario de Búsqueda (ABB)
   Persona A

   Cada nodo guarda un valor entero y referencias a sus dos
   hijos. Un hijo que no existe vale null.
   ========================================================= */

export class Nodo {
  constructor(valor) {
    this.valor = valor;     // número entero
    this.izquierdo = null;  // subárbol con valores MENORES
    this.derecho = null;    // subárbol con valores MAYORES
  }
}
