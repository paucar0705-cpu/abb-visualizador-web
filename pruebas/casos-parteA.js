/* =========================================================
   Casos de prueba de la Parte A (clase ABB)

   No usa el DOM: ejecutarPruebas() devuelve un arreglo de
   resultados. La página prueba-parteA.html los muestra en una
   tabla, y también se pueden correr desde Node.
   ========================================================= */

import { ABB } from "../js/abb.js";

/* ---------- Auxiliares ---------- */

// Crea un árbol insertando los valores en el orden dado.
function crearArbol(valores) {
  const arbol = new ABB();
  valores.forEach((v) => arbol.insertar(v));
  return arbol;
}

// Describe la forma del árbol en texto, por ejemplo:
//   "50(30(20,40),70(-,80))"
// Una hoja se escribe sola, "-" es un hijo vacío.
function forma(nodo) {
  if (nodo === null) return "-";
  if (nodo.izquierdo === null && nodo.derecho === null) return String(nodo.valor);
  return `${nodo.valor}(${forma(nodo.izquierdo)},${forma(nodo.derecho)})`;
}

// Valores en inorden (se calcula aquí para no depender de la Parte B).
function valoresInorden(nodo, lista = []) {
  if (nodo === null) return lista;
  valoresInorden(nodo.izquierdo, lista);
  lista.push(nodo.valor);
  valoresInorden(nodo.derecho, lista);
  return lista;
}

// Comprueba la propiedad del ABB: cada nodo debe estar estrictamente
// entre los límites que le imponen sus ancestros (sin duplicados).
function esABBValido(nodo, min = -Infinity, max = Infinity) {
  if (nodo === null) return true;
  if (!Number.isInteger(nodo.valor)) return false;
  if (nodo.valor <= min || nodo.valor >= max) return false;
  return esABBValido(nodo.izquierdo, min, nodo.valor) &&
         esABBValido(nodo.derecho, nodo.valor, max);
}

// Generador pseudoaleatorio con semilla: siempre produce la misma secuencia,
// así la prueba es repetible.
function crearAleatorio(semilla) {
  let estado = semilla;
  return (min, max) => {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    return min + (estado % (max - min + 1));
  };
}

/* ---------- Pruebas ---------- */

export function ejecutarPruebas() {
  const resultados = [];
  let grupo = "";

  // Registra una comprobación: compara como JSON el valor obtenido y el esperado.
  const comprobar = (nombre, obtenido, esperado) => {
    const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
    resultados.push({ grupo, nombre, esperado, obtenido, ok });
  };

  // Árbol de ejemplo usado en varias pruebas:
  //            50
  //        30        70
  //      20  40    60  80
  //         35 45    65
  const BASE = [50, 30, 70, 20, 40, 60, 80, 35, 45, 65];
  const FORMA_BASE = "50(30(20,40(35,45)),70(60(-,65),80))";

  /* 1. Árbol vacío */
  grupo = "Árbol vacío";
  {
    const a = new ABB();
    comprobar("estaVacio()", a.estaVacio(), true);
    comprobar("raiz es null", a.raiz, null);
    comprobar("minimo()", a.minimo(), null);
    comprobar("maximo()", a.maximo(), null);
    comprobar("buscar(5)", a.buscar(5), { encontrado: false, camino: [], motivo: "inexistente" });
    comprobar("eliminar(5)", a.eliminar(5),
      { eliminado: false, caso: null, camino: [], reemplazo: null, motivo: "inexistente" });
  }

  /* 2. Inserción de la raíz */
  grupo = "Inserción de la raíz";
  {
    const a = new ABB();
    comprobar("insertar(50)", a.insertar(50), { insertado: true, camino: [], motivo: null });
    comprobar("raiz.valor", a.raiz.valor, 50);
    comprobar("raíz sin hijos", [a.raiz.izquierdo, a.raiz.derecho], [null, null]);
    comprobar("estaVacio()", a.estaVacio(), false);
  }

  /* 3. Inserciones a izquierda y derecha */
  grupo = "Inserción izquierda / derecha";
  {
    const a = crearArbol([50]);
    comprobar("insertar(30) va a la izquierda", a.insertar(30), { insertado: true, camino: [50], motivo: null });
    comprobar("raiz.izquierdo.valor", a.raiz.izquierdo.valor, 30);
    comprobar("insertar(70) va a la derecha", a.insertar(70), { insertado: true, camino: [50], motivo: null });
    comprobar("raiz.derecho.valor", a.raiz.derecho.valor, 70);
    comprobar("insertar(40): camino hasta el padre", a.insertar(40), { insertado: true, camino: [50, 30], motivo: null });
    comprobar("forma", forma(a.raiz), "50(30(-,40),70)");
    comprobar("árbol de ejemplo completo", forma(crearArbol(BASE).raiz), FORMA_BASE);
  }

  /* 4. Negativos y cero */
  grupo = "Negativos y cero";
  {
    const a = crearArbol([0, -5, 5, -999, 999, -1]);
    comprobar("forma", forma(a.raiz), "0(-5(-999,-1),5(-,999))");
    comprobar("minimo()", a.minimo(), -999);
    comprobar("maximo()", a.maximo(), 999);
    comprobar("buscar(0)", a.buscar(0), { encontrado: true, camino: [0], motivo: null });
    comprobar("buscar(-1)", a.buscar(-1), { encontrado: true, camino: [0, -5, -1], motivo: null });
  }

  /* 5. Duplicados */
  grupo = "Rechazo de duplicados";
  {
    const a = crearArbol(BASE);
    comprobar("insertar(40) repetido", a.insertar(40), { insertado: false, camino: [50, 30, 40], motivo: "duplicado" });
    comprobar("insertar(50) repetido (raíz)", a.insertar(50), { insertado: false, camino: [50], motivo: "duplicado" });
    comprobar("el árbol no cambia", forma(a.raiz), FORMA_BASE);
  }

  /* 6. Valores inválidos */
  grupo = "Rechazo de inválidos";
  {
    const a = crearArbol(BASE);
    // [texto para mostrar, valor real]
    const invalidos = [
      ["3.5", 3.5], ['"10" (texto)', "10"], ["NaN", NaN], ["null", null], ["undefined", undefined],
      ["1000", 1000], ["-1000", -1000], ["Infinity", Infinity], ["true", true], ["[]", []], ["{}", {}],
    ];
    for (const [nombre, v] of invalidos) {
      comprobar(`insertar(${nombre})`, a.insertar(v), { insertado: false, camino: [], motivo: "invalido" });
    }
    comprobar('buscar("10")', a.buscar("10"), { encontrado: false, camino: [], motivo: "invalido" });
    comprobar("eliminar(3.5)", a.eliminar(3.5),
      { eliminado: false, caso: null, camino: [], reemplazo: null, motivo: "invalido" });
    comprobar("límites -999 y 999 sí son válidos",
      [a.insertar(-999).insertado, a.insertar(999).insertado], [true, true]);
    comprobar("el árbol solo cambió por -999 y 999", forma(a.raiz),
      "50(30(20(-999,-),40(35,45)),70(60(-,65),80(-,999)))");
  }

  /* 7. Búsqueda */
  grupo = "Búsqueda";
  {
    const a = crearArbol(BASE);
    comprobar("buscar(45) existe", a.buscar(45), { encontrado: true, camino: [50, 30, 40, 45], motivo: null });
    comprobar("buscar(50) es la raíz", a.buscar(50), { encontrado: true, camino: [50], motivo: null });
    comprobar("buscar(42) no existe", a.buscar(42), { encontrado: false, camino: [50, 30, 40, 45], motivo: "inexistente" });
    comprobar("buscar(99) no existe", a.buscar(99), { encontrado: false, camino: [50, 70, 80], motivo: "inexistente" });
    comprobar("buscar no modifica el árbol", forma(a.raiz), FORMA_BASE);
  }

  /* 8. Mínimo y máximo */
  grupo = "Mínimo y máximo";
  {
    const a = crearArbol(BASE);
    comprobar("minimo()", a.minimo(), 20);
    comprobar("maximo()", a.maximo(), 80);
    const solo = crearArbol([7]);
    comprobar("un solo nodo: min = max", [solo.minimo(), solo.maximo()], [7, 7]);
    const enLinea = crearArbol([10, 20, 30]);
    comprobar("sin hijos izquierdos: el mínimo es la raíz", enLinea.minimo(), 10);
  }

  /* 9. Eliminación de hoja */
  grupo = "Eliminar hoja";
  {
    const a = crearArbol(BASE);
    comprobar("eliminar(20)", a.eliminar(20),
      { eliminado: true, caso: "hoja", camino: [50, 30, 20], reemplazo: null, motivo: null });
    comprobar("forma", forma(a.raiz), "50(30(-,40(35,45)),70(60(-,65),80))");
  }

  /* 10. Un hijo izquierdo */
  grupo = "Eliminar con un hijo izquierdo";
  {
    const a = crearArbol([50, 30, 70, 20, 10]);
    comprobar("eliminar(20)", a.eliminar(20),
      { eliminado: true, caso: "unHijo", camino: [50, 30, 20], reemplazo: 10, motivo: null });
    comprobar("forma", forma(a.raiz), "50(30(10,-),70)");
  }

  /* 11. Un hijo derecho */
  grupo = "Eliminar con un hijo derecho";
  {
    const a = crearArbol(BASE);
    comprobar("eliminar(60)", a.eliminar(60),
      { eliminado: true, caso: "unHijo", camino: [50, 70, 60], reemplazo: 65, motivo: null });
    comprobar("forma", forma(a.raiz), "50(30(20,40(35,45)),70(65,80))");
  }

  /* 12. Dos hijos */
  grupo = "Eliminar con dos hijos";
  {
    const a = crearArbol(BASE);
    comprobar("eliminar(30): sucesor 35 está a la izquierda del subárbol derecho", a.eliminar(30),
      { eliminado: true, caso: "dosHijos", camino: [50, 30], reemplazo: 35, motivo: null });
    comprobar("forma", forma(a.raiz), "50(35(20,40(-,45)),70(60(-,65),80))");

    const b = crearArbol(BASE);
    comprobar("eliminar(70): sucesor 80 es el hijo derecho directo", b.eliminar(70),
      { eliminado: true, caso: "dosHijos", camino: [50, 70], reemplazo: 80, motivo: null });
    comprobar("forma", forma(b.raiz), "50(30(20,40(35,45)),80(60(-,65),-))");
  }

  /* 13. Eliminación de la raíz */
  grupo = "Eliminar la raíz";
  {
    const a = crearArbol([50]);
    comprobar("raíz única (hoja)", a.eliminar(50),
      { eliminado: true, caso: "hoja", camino: [50], reemplazo: null, motivo: null });
    comprobar("el árbol queda vacío", [a.estaVacio(), a.raiz], [true, null]);

    const b = crearArbol([50, 30, 20]);
    comprobar("raíz con un hijo", b.eliminar(50),
      { eliminado: true, caso: "unHijo", camino: [50], reemplazo: 30, motivo: null });
    comprobar("la nueva raíz es 30", forma(b.raiz), "30(20,-)");

    const c = crearArbol([50, 30, 70, 60, 80, 65]);
    comprobar("raíz con dos hijos (el sucesor 60 tiene hijo derecho)", c.eliminar(50),
      { eliminado: true, caso: "dosHijos", camino: [50], reemplazo: 60, motivo: null });
    comprobar("el 65 sube al lugar del sucesor", forma(c.raiz), "60(30,70(65,80))");
  }

  /* 14. Nodo inexistente */
  grupo = "Eliminar inexistente";
  {
    const a = crearArbol(BASE);
    comprobar("eliminar(99)", a.eliminar(99),
      { eliminado: false, caso: null, camino: [50, 70, 80], reemplazo: null, motivo: "inexistente" });
    comprobar("eliminar(42)", a.eliminar(42),
      { eliminado: false, caso: null, camino: [50, 30, 40, 45], reemplazo: null, motivo: "inexistente" });
    comprobar("el árbol no cambia", forma(a.raiz), FORMA_BASE);
  }

  /* 15. Eliminar todos los nodos */
  grupo = "Eliminar todos los nodos";
  {
    const a = crearArbol(BASE);
    const restantes = new Set(BASE);
    let todoBien = true;
    for (const v of [50, 30, 65, 20, 70, 45, 80, 35, 60, 40]) {
      const r = a.eliminar(v);
      restantes.delete(v);
      const esperado = [...restantes].sort((x, y) => x - y);
      if (!r.eliminado || !esABBValido(a.raiz) ||
          JSON.stringify(valoresInorden(a.raiz)) !== JSON.stringify(esperado)) {
        todoBien = false;
      }
    }
    comprobar("cada eliminación deja un ABB válido con los valores correctos", todoBien, true);
    comprobar("el árbol queda vacío", [a.estaVacio(), a.raiz, a.minimo(), a.maximo()], [true, null, null, null]);
    comprobar("se puede volver a insertar", a.insertar(5), { insertado: true, camino: [], motivo: null });
  }

  /* 16. Análisis de eliminación (no modifica el árbol) */
  grupo = "Análisis de eliminación";
  {
    const a = crearArbol(BASE);
    comprobar("dos hijos: se baja 40 → 35 hasta el sucesor", a.analizarEliminacion(30),
      { eliminable: true, caso: "dosHijos", camino: [50, 30], reemplazo: 35, caminoSucesor: [40, 35], motivo: null });
    comprobar("dos hijos: sucesor es el hijo derecho directo", a.analizarEliminacion(70),
      { eliminable: true, caso: "dosHijos", camino: [50, 70], reemplazo: 80, caminoSucesor: [80], motivo: null });
    comprobar("raíz con dos hijos", a.analizarEliminacion(50),
      { eliminable: true, caso: "dosHijos", camino: [50], reemplazo: 60, caminoSucesor: [70, 60], motivo: null });
    comprobar("hoja", a.analizarEliminacion(20),
      { eliminable: true, caso: "hoja", camino: [50, 30, 20], reemplazo: null, caminoSucesor: [], motivo: null });
    comprobar("un hijo derecho", a.analizarEliminacion(60),
      { eliminable: true, caso: "unHijo", camino: [50, 70, 60], reemplazo: 65, caminoSucesor: [], motivo: null });
    comprobar("inexistente", a.analizarEliminacion(99),
      { eliminable: false, caso: null, camino: [50, 70, 80], reemplazo: null, caminoSucesor: [], motivo: "inexistente" });
    comprobar("inválido", a.analizarEliminacion("7"),
      { eliminable: false, caso: null, camino: [], reemplazo: null, caminoSucesor: [], motivo: "invalido" });
    comprobar("árbol vacío", new ABB().analizarEliminacion(5),
      { eliminable: false, caso: null, camino: [], reemplazo: null, caminoSucesor: [], motivo: "inexistente" });
    comprobar("analizar no modifica el árbol", forma(a.raiz), FORMA_BASE);
  }

  /* 17. Propiedad del ABB tras muchas modificaciones */
  grupo = "Propiedad del ABB";
  {
    const aleatorio = crearAleatorio(2026);
    const a = new ABB();
    const modelo = new Set(); // lista "de referencia" para comparar
    let operaciones = 0;
    let fallos = 0;
    let rechazosCorrectos = true;
    let analisisCorrecto = true;

    for (let i = 0; i < 2000; i++) {
      const v = aleatorio(-60, 60);
      const insertar = aleatorio(0, 2) > 0; // 2 de cada 3 operaciones son inserciones
      if (insertar) {
        const r = a.insertar(v);
        if (r.insertado === modelo.has(v)) rechazosCorrectos = false; // duplicado mal detectado
        modelo.add(v);
      } else {
        const plan = a.analizarEliminacion(v); // debe predecir exactamente lo que hará eliminar
        const r = a.eliminar(v);
        if (r.eliminado !== modelo.has(v)) rechazosCorrectos = false; // inexistente mal detectado
        if (plan.eliminable !== r.eliminado || plan.caso !== r.caso || plan.reemplazo !== r.reemplazo ||
            JSON.stringify(plan.camino) !== JSON.stringify(r.camino) ||
            (r.caso === "dosHijos" && plan.caminoSucesor.at(-1) !== r.reemplazo)) {
          analisisCorrecto = false;
        }
        modelo.delete(v);
      }
      operaciones++;
      const esperado = [...modelo].sort((x, y) => x - y);
      if (!esABBValido(a.raiz) || JSON.stringify(valoresInorden(a.raiz)) !== JSON.stringify(esperado)) {
        fallos++;
      }
    }
    comprobar(`ABB válido e inorden correcto tras ${operaciones} operaciones`, fallos, 0);
    comprobar("duplicados e inexistentes detectados como en el modelo", rechazosCorrectos, true);
    comprobar("analizarEliminacion predice cada eliminación", analisisCorrecto, true);
    const esperado = [...modelo].sort((x, y) => x - y);
    comprobar("mínimo y máximo coinciden con el modelo",
      [a.minimo(), a.maximo()], [esperado[0] ?? null, esperado[esperado.length - 1] ?? null]);
  }

  return resultados;
}
