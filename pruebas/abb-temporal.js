/* ABB TEMPORAL — solo para probar la Parte B mientras L sube js/abb.js.
   Sigue la interfaz acordada. NO es parte de la entrega: cuando exista
   js/abb.js, la página de pruebas debe cargar ese archivo en su lugar. */
class Nodo {
  constructor(valor) {
    this.valor = valor;
    this.izquierdo = null;
    this.derecho = null;
  }
}

class ABB {
  constructor() {
    this.raiz = null;
  }
  insertar(valor) {
    const nuevo = new Nodo(valor);
    if (!this.raiz) { this.raiz = nuevo; return true; }
    let actual = this.raiz;
    while (true) {
      if (valor === actual.valor) return false;          // sin duplicados
      const lado = valor < actual.valor ? "izquierdo" : "derecho";
      if (!actual[lado]) { actual[lado] = nuevo; return true; }
      actual = actual[lado];
    }
  }
}
