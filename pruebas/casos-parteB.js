/* =========================================================
   Casos de prueba de la Parte B (recorridos, niveles y
   operaciones libres) sobre la clase ABB real de la Parte A.

   No usa el DOM: ejecutarPruebas() devuelve un arreglo de
   resultados { grupo, nombre, esperado, obtenido, ok } con el
   mismo formato que casos-parteA.js.
   ========================================================= */

import { ABB } from "../js/abb.js";
import "../js/abb-parteB.js";
import { ejecutar } from "../js/ui-parteB.js";

// Crea un árbol insertando los valores en el orden dado.
function crearArbol(valores) {
  const arbol = new ABB();
  valores.forEach((v) => arbol.insertar(v));
  return arbol;
}

// Árbol de ejemplo usado en casi todas las pruebas:
//              50
//         30        70
//       20  40    60  80
//          35 45    65
const EJEMPLO = [50, 30, 70, 20, 40, 60, 80, 35, 45, 65];

export function ejecutarPruebas() {
  const resultados = [];
  let grupo = "";
  const caso = (nombre, obtenido, esperado) => {
    const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
    resultados.push({ grupo, nombre, esperado, obtenido, ok });
  };

  const arbol = crearArbol(EJEMPLO);
  const vacio = new ABB();
  const soloRaiz = crearArbol([7]);
  const cadena = crearArbol([1, 2, 3, 4]);        // árbol degenerado (lista)

  grupo = "5-8. Recorridos";
  caso("Anchura", arbol.recorridoAnchura(), [50, 30, 70, 20, 40, 60, 80, 35, 45, 65]);
  caso("Preorden", arbol.preorden(), [50, 30, 20, 40, 35, 45, 70, 60, 65, 80]);
  caso("Postorden", arbol.postorden(), [20, 35, 45, 40, 30, 65, 60, 80, 70, 50]);
  caso("Inorden (ordenado)", arbol.inorden(), [20, 30, 35, 40, 45, 50, 60, 65, 70, 80]);
  caso("Árbol vacío: anchura", vacio.recorridoAnchura(), []);
  caso("Árbol vacío: preorden", vacio.preorden(), []);
  caso("Solo raíz: postorden", soloRaiz.postorden(), [7]);
  caso("Árbol degenerado: anchura", cadena.recorridoAnchura(), [1, 2, 3, 4]);
  caso("Negativos: inorden", crearArbol([0, -999, 999, -5]).inorden(), [-999, -5, 0, 999]);

  grupo = "9. Número de niveles";
  caso("Árbol de ejemplo", arbol.numeroNiveles(), 4);
  caso("Árbol vacío", vacio.numeroNiveles(), 0);
  caso("Solo raíz", soloRaiz.numeroNiveles(), 1);
  caso("Árbol degenerado", cadena.numeroNiveles(), 4);

  grupo = "10. Nivel de un nodo (raíz = 1)";
  caso("Raíz 50", arbol.nivelDe(50), 1);
  caso("Nodo 70", arbol.nivelDe(70), 2);
  caso("Nodo 35", arbol.nivelDe(35), 4);
  caso("No existe 99", arbol.nivelDe(99), -1);
  caso("Árbol vacío", vacio.nivelDe(5), -1);
  caso("Árbol degenerado: 4", cadena.nivelDe(4), 4);

  grupo = "Libre: contar nodos y hojas";
  caso("Árbol de ejemplo", arbol.contarNodosYHojas(), { totalNodos: 10, totalHojas: 5, hojas: [20, 35, 45, 65, 80] });
  caso("Árbol vacío", vacio.contarNodosYHojas(), { totalNodos: 0, totalHojas: 0, hojas: [] });
  caso("Solo raíz (es hoja)", soloRaiz.contarNodosYHojas(), { totalNodos: 1, totalHojas: 1, hojas: [7] });

  grupo = "Libre: suma de los valores";
  caso("Árbol de ejemplo", arbol.sumaValores(),
    { suma: 495, cantidad: 10, promedio: 49.5, valores: [50, 30, 70, 20, 40, 60, 80, 35, 45, 65] });
  caso("Árbol vacío", vacio.sumaValores(), { suma: 0, cantidad: 0, promedio: null, valores: [] });
  caso("Con negativos", crearArbol([0, -999, 999, -5]).sumaValores().suma, -5);

  grupo = "Libre: camino de la raíz a un nodo";
  caso("Camino a 45", arbol.caminoA(45), [50, 30, 40, 45]);
  caso("Camino a la raíz", arbol.caminoA(50), [50]);
  caso("No existe 99", arbol.caminoA(99), null);
  caso("Coincide con buscar() de la Parte A", arbol.caminoA(65), arbol.buscar(65).camino);

  grupo = "Integración con eliminar() de la Parte A";
  const modificado = crearArbol(EJEMPLO);
  modificado.eliminar(30);                       // caso dos hijos: lo reemplaza 35
  caso("Inorden sigue ordenado", modificado.inorden(), [20, 35, 40, 45, 50, 60, 65, 70, 80]);
  caso("Nivel del reemplazo 35", modificado.nivelDe(35), 2);
  modificado.eliminar(50);                       // se elimina la raíz
  caso("Anchura tras borrar la raíz", modificado.recorridoAnchura(), [60, 35, 70, 20, 40, 65, 80, 45]);

  grupo = "Opciones del menú: ejecutar()";
  caso("Texto \"35\" → nivel 4", ejecutar("nivelDe", arbol, "35").texto, "El nodo 35 está en el nivel 4.");
  caso("Texto \"abc\" → error", ejecutar("nivelDe", arbol, "abc").ok, false);
  caso("Fuera de rango 1000 → error", ejecutar("camino", arbol, "1000").ok, false);
  caso("Decimal 3.5 → error", ejecutar("camino", arbol, "3.5").ok, false);
  caso("Árbol vacío → mensaje", ejecutar("preorden", vacio).texto, "El árbol está vacío. Inserta elementos primero.");
  caso("Suma (texto)", ejecutar("suma", crearArbol([2, 1, 4])).texto, "Suma: 2 + 1 + 4 = 7   ·   Promedio: 2.33");
  caso("Camino (nodos a iluminar)", ejecutar("camino", arbol, "45").nodos, [50, 30, 40, 45]);

  return resultados;
}
