/* =========================================================
   ABB - Parte B: conexión de mis operaciones con la interfaz
   Autora: Paola Cardeña Koyoc (DSM 4A)

   Se carga DESPUÉS de abb.js y abb-parteB.js (y antes o después
   de ui.js, no importa). No dibuja el árbol: usa el dibujo de L.

   ACUERDO CON L (pendiente de confirmar):
     - Cada nodo dibujado tiene el atributo data-valor="X"
       (por ejemplo <g class="nodo" data-valor="50">...</g>).
     - Mientras se anima, al nodo se le pone la clase CSS
       "nodo-activo" y al terminar "nodo-visitado".
       L puede darles el estilo que quiera en estilos.css.

   Uso desde ui.js (por ejemplo en el click de un botón del menú):
     const r = ParteB.ejecutar("preorden", arbol);
     mostrarMensaje(r.texto);          // función de L
     ParteB.animar(r.nodos);           // ilumina los nodos en orden
   ========================================================= */

const ParteB = (() => {
  // Milisegundos que dura iluminado cada nodo
  let velocidad = 700;
  let animacionActual = 0;   // sirve para cancelar una animación anterior

  // Busca el elemento dibujado de un nodo por su valor
  const elementoDe = (valor) =>
    document.querySelector(`[data-valor="${CSS.escape(String(valor))}"]`);

  // Quita las clases de animación de todos los nodos
  function limpiar() {
    animacionActual++;
    document.querySelectorAll(".nodo-activo, .nodo-visitado").forEach((el) =>
      el.classList.remove("nodo-activo", "nodo-visitado")
    );
  }

  // Ilumina los nodos uno por uno, en el orden del arreglo recibido.
  // Devuelve una promesa que termina cuando acaba la animación.
  // Si llamas otra vez antes de que termine, la anterior se cancela.
  async function animar(valores, ms = velocidad) {
    limpiar();
    const id = animacionActual;
    const espera = (t) => new Promise((ok) => setTimeout(ok, t));
    for (const v of valores) {
      if (id !== animacionActual) return;  // se canceló
      const el = elementoDe(v);
      if (el) el.classList.add("nodo-activo");
      await espera(ms);
      if (el) el.classList.replace("nodo-activo", "nodo-visitado");
    }
  }

  // Las 9 opciones de la Parte B, con su nombre real para el menú.
  // pideValor = true si la opción necesita que el usuario escriba un número.
  const OPCIONES = [
    { id: "anchura",   numero: 5,  nombre: "Recorrido en anchura (por niveles)", pideValor: false },
    { id: "preorden",  numero: 6,  nombre: "Recorrido en preorden",              pideValor: false },
    { id: "postorden", numero: 7,  nombre: "Recorrido en postorden",             pideValor: false },
    { id: "inorden",   numero: 8,  nombre: "Recorrido en inorden",               pideValor: false },
    { id: "niveles",   numero: 9,  nombre: "Número de niveles del árbol",        pideValor: false },
    { id: "nivelDe",   numero: 10, nombre: "Nivel de un nodo",                   pideValor: true  },
    { id: "minMax",    numero: 11, nombre: "Valor mínimo y máximo",              pideValor: false },
    { id: "contar",    numero: 12, nombre: "Contar nodos y hojas",               pideValor: false },
    { id: "camino",    numero: 13, nombre: "Camino de la raíz a un nodo",        pideValor: true  },
  ];

  // Ejecuta una opción y devuelve { ok, texto, nodos }:
  //   texto -> mensaje para mostrar al usuario
  //   nodos -> valores a iluminar, en orden (puede ir vacío)
  function ejecutar(id, arbol, valor) {
    if (!arbol || !arbol.raiz) {
      return { ok: false, texto: "El árbol está vacío. Inserta elementos primero.", nodos: [] };
    }
    switch (id) {
      case "anchura": {
        const r = arbol.recorridoAnchura();
        return { ok: true, texto: "Anchura: " + r.join(" → "), nodos: r };
      }
      case "preorden": {
        const r = arbol.preorden();
        return { ok: true, texto: "Preorden: " + r.join(" → "), nodos: r };
      }
      case "postorden": {
        const r = arbol.postorden();
        return { ok: true, texto: "Postorden: " + r.join(" → "), nodos: r };
      }
      case "inorden": {
        const r = arbol.inorden();
        return { ok: true, texto: "Inorden: " + r.join(" → "), nodos: r };
      }
      case "niveles": {
        const n = arbol.numeroNiveles();
        return { ok: true, texto: `El árbol tiene ${n} nivel${n === 1 ? "" : "es"}.`, nodos: arbol.recorridoAnchura() };
      }
      case "nivelDe": {
        const v = aNumero(valor);
        if (v === null) return { ok: false, texto: "Escribe un número válido.", nodos: [] };
        const nivel = arbol.nivelDe(v);
        if (nivel === -1) return { ok: false, texto: `El ${v} no está en el árbol.`, nodos: [] };
        return { ok: true, texto: `El nodo ${v} está en el nivel ${nivel}.`, nodos: arbol.caminoA(v) };
      }
      case "minMax": {
        const r = arbol.minimoYMaximo();
        return { ok: true, texto: `Mínimo: ${r.minimo}   ·   Máximo: ${r.maximo}`, nodos: [r.minimo, r.maximo] };
      }
      case "contar": {
        const r = arbol.contarNodosYHojas();
        return {
          ok: true,
          texto: `Nodos totales: ${r.totalNodos}   ·   Hojas: ${r.totalHojas} (${r.hojas.join(", ")})`,
          nodos: r.hojas,
        };
      }
      case "camino": {
        const v = aNumero(valor);
        if (v === null) return { ok: false, texto: "Escribe un número válido.", nodos: [] };
        const r = arbol.caminoA(v);
        if (!r) return { ok: false, texto: `El ${v} no está en el árbol.`, nodos: [] };
        return { ok: true, texto: "Camino: " + r.join(" → "), nodos: r };
      }
      default:
        return { ok: false, texto: "Opción desconocida: " + id, nodos: [] };
    }
  }

  // Lo que se escribe en un <input> llega como texto ("50"); el árbol
  // guarda números, así que hay que convertirlo antes de comparar.
  function aNumero(valor) {
    if (valor === undefined || valor === null || String(valor).trim() === "") return null;
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
  }

  return {
    OPCIONES,
    ejecutar,
    animar,
    limpiar,
    setVelocidad: (ms) => { velocidad = ms; },
  };
})();
