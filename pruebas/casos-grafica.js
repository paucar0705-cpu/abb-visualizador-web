/* =========================================================
   Casos de prueba de la representación gráfica (Parte A)

   ESCENARIOS: los árboles que se dibujan en prueba-grafica.html.
   ejecutarPruebas(): revisa calcularPosiciones() sin usar el DOM,
   así que también se puede correr desde Node.
   ========================================================= */

import { ABB } from "../js/abb.js";
import { calcularPosiciones, MEDIDAS } from "../js/arbol-svg.js";

function crearArbol(valores) {
  const arbol = new ABB();
  valores.forEach((v) => arbol.insertar(v));
  return arbol;
}

// Cada escenario crea su propio árbol.
export const ESCENARIOS = [
  { nombre: "Árbol vacío", crear: () => new ABB() },
  { nombre: "Un solo nodo", crear: () => crearArbol([50]) },
  { nombre: "Árbol equilibrado", crear: () => crearArbol([50, 30, 70, 20, 40, 60, 80]) },
  { nombre: "Inclinado a la izquierda", crear: () => crearArbol([60, 50, 40, 30, 20, 10]) },
  { nombre: "Inclinado a la derecha", crear: () => crearArbol([10, 20, 30, 40, 50, 60]) },
  { nombre: "Negativos, cero y positivos", crear: () => crearArbol([0, -5, 5, -999, 999, -1, 3]) },
  {
    nombre: "Después de eliminar la raíz (50 → sucesor 60)",
    crear: () => {
      const a = crearArbol([50, 30, 70, 20, 40, 60, 80, 35, 45, 65]);
      a.eliminar(50);
      return a;
    },
  },
  {
    nombre: "Varios niveles (7)",
    crear: () => crearArbol([50, 25, 75, 12, 37, 62, 87, 6, 18, 31, 43, 56, 68, 81, 93, 3, 9, 15, 21, 1, 4, 2, 100, -50, 500]),
  },
];

/* ---------- Auxiliares ---------- */

// Lista de { valor, padre, nivel } leída directamente del árbol.
function datosReales(arbol) {
  const lista = [];
  const recorrer = (nodo, padre, nivel) => {
    if (nodo === null) return;
    lista.push({ valor: nodo.valor, padre, nivel });
    recorrer(nodo.izquierdo, nodo.valor, nivel + 1);
    recorrer(nodo.derecho, nodo.valor, nivel + 1);
  };
  recorrer(arbol.raiz, null, 1);
  return lista;
}

/* Revisa todas las reglas del dibujo para un árbol. Devuelve un
   objeto con cada regla y si se cumple (true/false). */
export function verificarDisposicion(arbol, d, medidas = MEDIDAS) {
  const { radio, separacionX, separacionY, margen } = medidas;
  const reales = datosReales(arbol);
  const porValor = new Map(d.nodos.map((n) => [n.valor, n]));
  const n = reales.length;

  // Cada nodo del árbol aparece exactamente una vez.
  const todosLosNodos = d.nodos.length === n && reales.every((r) => porValor.has(r.valor));

  // Nivel e y correctos (raíz = nivel 1).
  const nivelesCorrectos = reales.every((r) => {
    const p = porValor.get(r.valor);
    return p && p.nivel === r.nivel && p.y === margen + (r.nivel - 1) * separacionY;
  });

  // Orden horizontal = orden de los valores (inorden), una columna por nodo.
  const ordenadosPorX = [...d.nodos].sort((a, b) => a.x - b.x);
  const ordenHorizontal = ordenadosPorX.every((p, i) =>
    p.x === margen + i * separacionX && (i === 0 || ordenadosPorX[i - 1].valor < p.valor));

  // Ningún par de círculos se toca (distancia entre centros > diámetro).
  let sinSuperposicion = true;
  for (let i = 0; i < d.nodos.length; i++) {
    for (let j = i + 1; j < d.nodos.length; j++) {
      const a = d.nodos[i], b = d.nodos[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) <= 2 * radio) sinSuperposicion = false;
    }
  }

  // Una arista por cada hijo, y une los centros del padre real y del hijo.
  const aristasCorrectas = d.aristas.length === Math.max(n - 1, 0) &&
    reales.filter((r) => r.padre !== null).every((r) => {
      const a = d.aristas.find((x) => x.hijo === r.valor);
      const p = porValor.get(r.padre), h = porValor.get(r.valor);
      return a && a.padre === r.padre && a.x1 === p.x && a.y1 === p.y && a.x2 === h.x && a.y2 === h.y;
    });

  // Hijo izquierdo a la izquierda del padre y derecho a la derecha.
  const ladosCorrectos = d.aristas.every((a) =>
    (a.hijo < a.padre && a.x2 < a.x1) || (a.hijo > a.padre && a.x2 > a.x1));

  // Exactamente una raíz y es la del árbol.
  const raices = d.nodos.filter((p) => p.esRaiz);
  const raizCorrecta = n === 0 ? raices.length === 0 : raices.length === 1 && raices[0].valor === arbol.raiz.valor;

  // Todos los círculos caben dentro del tamaño calculado.
  const dentroDelArea = d.nodos.every((p) =>
    p.x - radio >= 0 && p.x + radio <= d.ancho && p.y - radio >= 0 && p.y + radio <= d.alto);

  // El tamaño crece con el árbol: ancho según nodos, alto según niveles.
  const nivelesMax = reales.reduce((m, r) => Math.max(m, r.nivel), 0);
  const tamanoCorrecto = n === 0
    ? d.ancho === 0 && d.alto === 0 && d.niveles === 0
    : d.ancho === 2 * margen + (n - 1) * separacionX &&
      d.alto === 2 * margen + (nivelesMax - 1) * separacionY && d.niveles === nivelesMax;

  return { todosLosNodos, nivelesCorrectos, ordenHorizontal, sinSuperposicion,
           aristasCorrectas, ladosCorrectos, raizCorrecta, dentroDelArea, tamanoCorrecto };
}

/* ---------- Pruebas ---------- */

export function ejecutarPruebas() {
  const resultados = [];
  let grupo = "";
  const comprobar = (nombre, obtenido, esperado) => {
    const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
    resultados.push({ grupo, nombre, esperado, obtenido, ok });
  };

  // Reglas generales en cada escenario.
  for (const escenario of ESCENARIOS) {
    grupo = escenario.nombre;
    const arbol = escenario.crear();
    const d = calcularPosiciones(arbol.raiz);
    for (const [regla, cumple] of Object.entries(verificarDisposicion(arbol, d))) {
      comprobar(regla, cumple, true);
    }
  }

  const { margen, separacionX, separacionY, radio } = MEDIDAS;

  // Las medidas deben dejar espacio visible entre círculos y para la etiqueta "raíz".
  grupo = "Medidas";
  comprobar("separación horizontal > diámetro + 8px", separacionX >= 2 * radio + 8, true);
  comprobar("separación vertical > diámetro + 8px", separacionY >= 2 * radio + 8, true);
  comprobar("el margen deja lugar a la etiqueta \"raíz\"", margen >= radio + 20, true);

  // Valores exactos en algunos casos, para que el cálculo sea fácil de seguir.
  grupo = "Posiciones exactas";
  {
    const d = calcularPosiciones(crearArbol([50]).raiz);
    comprobar("un nodo: posición y tamaño", [d.nodos[0].x, d.nodos[0].y, d.ancho, d.alto], [margen, margen, 2 * margen, 2 * margen]);

    const eq = calcularPosiciones(crearArbol([50, 30, 70, 20, 40, 60, 80]).raiz);
    const raiz = eq.nodos.find((p) => p.esRaiz);
    comprobar("equilibrado: la raíz queda centrada", raiz.x, eq.ancho / 2);
    comprobar("equilibrado: 3 niveles", eq.niveles, 3);

    const izq = calcularPosiciones(crearArbol([60, 50, 40, 30, 20, 10]).raiz);
    comprobar("inclinado a la izquierda: escalera hacia abajo-izquierda",
      izq.nodos.map((p) => [p.valor, p.nivel]),
      [[10, 6], [20, 5], [30, 4], [40, 3], [50, 2], [60, 1]]);

    const der = calcularPosiciones(crearArbol([10, 20, 30, 40, 50, 60]).raiz);
    comprobar("inclinado a la derecha: escalera hacia abajo-derecha",
      der.nodos.map((p) => [p.valor, p.nivel]),
      [[10, 1], [20, 2], [30, 3], [40, 4], [50, 5], [60, 6]]);
    comprobar("inclinado: alto = 6 niveles", der.alto, 2 * margen + 5 * separacionY);

    const elim = crearArbol([50, 30, 70, 20, 40, 60, 80, 35, 45, 65]);
    elim.eliminar(50);
    const de = calcularPosiciones(elim.raiz);
    comprobar("tras eliminar la raíz, la nueva raíz es el sucesor 60",
      de.nodos.filter((p) => p.esRaiz).map((p) => p.valor), [60]);
    comprobar("tras eliminar la raíz: 9 nodos y una columna menos", [de.nodos.length, de.ancho], [9, 2 * margen + 8 * separacionX]);
  }

  return resultados;
}
