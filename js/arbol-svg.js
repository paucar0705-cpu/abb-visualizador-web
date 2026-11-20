/* =========================================================
   Representación gráfica del ABB en SVG
   Persona A

   Este módulo NO modifica el árbol: solo lo lee para dibujarlo.
   Tiene dos partes:
     1) calcularPosiciones(): cálculo puro (sin DOM) de dónde va
        cada nodo. Se puede probar sin navegador.
     2) dibujarArbol(): crea los elementos SVG a partir de esas
        posiciones. Redibuja el árbol completo cada vez.

   Cómo se acomodan los nodos:
     - Horizontal (x): según su posición en el recorrido INORDEN.
       El primer nodo del inorden va en la columna 0, el segundo
       en la 1, etc. Como cada nodo tiene su propia columna, dos
       nodos nunca se enciman, y como el inorden de un ABB está
       ordenado, los menores quedan a la izquierda y los mayores
       a la derecha.
     - Vertical (y): según su nivel (la raíz es el nivel 1).

   Contrato visual (para animaciones y la Parte B):
     <g class="nodo [nodo-raiz]" data-valor="X" data-nivel="N">
       <circle class="disco" cx cy r/>     (primer círculo: el nodo)
       <circle class="anillo" .../>        (doble línea decorativa)
       <text>X</text>
     </g>
     <path class="arista" data-padre="P" data-hijo="H" d="M x1 y1 C … x2 y2"/>
   ========================================================= */

const SVG_NS = "http://www.w3.org/2000/svg";

// Medidas del dibujo, en píxeles.
export const MEDIDAS = Object.freeze({
  radio: 22,          // radio de cada nodo (cabe "-999")
  separacionX: 56,    // distancia entre columnas (diámetro + 12 de espacio)
  separacionY: 80,    // distancia entre niveles
  margen: 44,         // espacio libre alrededor del árbol (incluye la etiqueta "raíz")
});

/* ---------- 1) Cálculo de posiciones (sin DOM) ----------
   Devuelve:
     {
       nodos:   [{ valor, nivel, x, y, esRaiz }]  // en orden inorden
       aristas: [{ padre, hijo, x1, y1, x2, y2 }] // del centro del padre al del hijo
       ancho, alto,  // tamaño total del dibujo (0 si el árbol está vacío)
       niveles       // número de niveles (0 si está vacío)
     } */
export function calcularPosiciones(raiz, medidas = MEDIDAS) {
  const { separacionX, separacionY, margen } = medidas;
  const posiciones = new Map(); // Nodo -> datos de su posición
  let columna = 0;
  let niveles = 0;

  // Recorrido inorden: izquierdo, nodo, derecho.
  function recorrer(nodo, nivel) {
    if (nodo === null) return;
    recorrer(nodo.izquierdo, nivel + 1);
    posiciones.set(nodo, {
      valor: nodo.valor,
      nivel,
      x: margen + columna * separacionX,
      y: margen + (nivel - 1) * separacionY,
      esRaiz: nivel === 1,
    });
    columna++;
    niveles = Math.max(niveles, nivel);
    recorrer(nodo.derecho, nivel + 1);
  }
  recorrer(raiz, 1);

  // Una arista por cada relación padre -> hijo.
  const aristas = [];
  for (const [nodo, padre] of posiciones) {
    for (const hijo of [nodo.izquierdo, nodo.derecho]) {
      if (hijo === null) continue;
      const h = posiciones.get(hijo);
      aristas.push({ padre: padre.valor, hijo: h.valor, x1: padre.x, y1: padre.y, x2: h.x, y2: h.y });
    }
  }

  const total = posiciones.size;
  return {
    nodos: [...posiciones.values()],
    aristas,
    ancho: total === 0 ? 0 : 2 * margen + (total - 1) * separacionX,
    alto: niveles === 0 ? 0 : 2 * margen + (niveles - 1) * separacionY,
    niveles,
  };
}

/* ---------- 2) Dibujo en SVG ---------- */

// Crea un elemento SVG con sus atributos.
function crear(etiqueta, atributos = {}, texto = null) {
  const elemento = document.createElementNS(SVG_NS, etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) {
    elemento.setAttribute(nombre, valor);
  }
  if (texto !== null) elemento.textContent = texto;
  return elemento;
}

// El SVG mide exactamente lo que el dibujo; si no cabe en su
// contenedor, el contenedor (con overflow: auto) muestra barras.
function ajustarTamano(svg, ancho, alto) {
  svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
  svg.setAttribute("width", ancho);
  svg.setAttribute("height", alto);
}

function dibujarVacio(svg) {
  const ancho = 360;
  const alto = 140;
  ajustarTamano(svg, ancho, alto);
  const grupo = crear("g", { class: "estado-vacio" });
  grupo.append(
    crear("text", { x: ancho / 2, y: alto / 2 - 12, class: "estado-vacio-titulo" }, "El árbol está vacío"),
    crear("text", { x: ancho / 2, y: alto / 2 + 16, class: "estado-vacio-ayuda" }, "Inserta un número para comenzar")
  );
  svg.append(grupo);
  svg.setAttribute("aria-label", "Árbol binario de búsqueda vacío");
}

/* Desplaza el contenedor con barras para que la raíz quede centrada
   horizontalmente y se vea la parte de arriba del árbol. Útil cuando
   el árbol es más ancho que el área visible. */
export function centrarEnRaiz(contenedor, svg, disposicion) {
  const raiz = disposicion?.nodos.find((n) => n.esRaiz);
  if (!raiz) return;
  // Si el SVG se muestra con zoom, su tamaño en pantalla no coincide con el
  // viewBox: se usa la escala real para ubicar la raíz.
  const caja = svg.getBoundingClientRect();
  const escala = disposicion.ancho > 0 ? caja.width / disposicion.ancho : 1;
  // Posición del SVG dentro del contenido desplazable del contenedor
  const desplazamientoSvg = caja.left - contenedor.getBoundingClientRect().left + contenedor.scrollLeft;
  contenedor.scrollLeft = desplazamientoSvg + raiz.x * escala - contenedor.clientWidth / 2;
  contenedor.scrollTop = 0;
}

/* Borra el contenido del <svg> y dibuja el árbol completo.
   Devuelve el resultado de calcularPosiciones (útil para pruebas
   y animaciones). */
export function dibujarArbol(svg, arbol, medidas = MEDIDAS) {
  svg.replaceChildren();

  if (arbol.estaVacio()) {
    dibujarVacio(svg);
    return calcularPosiciones(null, medidas);
  }

  const disposicion = calcularPosiciones(arbol.raiz, medidas);
  ajustarTamano(svg, disposicion.ancho, disposicion.alto);

  // Primero las aristas, para que los círculos queden encima de las líneas.
  // Cada arista es una curva suave (como una rama) que sale vertical del
  // padre y llega vertical al hijo; empieza y termina en sus centros.
  const grupoAristas = crear("g", { class: "aristas" });
  for (const a of disposicion.aristas) {
    const medio = (a.y1 + a.y2) / 2;
    grupoAristas.append(crear("path", {
      class: "arista",
      "data-padre": a.padre,
      "data-hijo": a.hijo,
      d: `M ${a.x1} ${a.y1} C ${a.x1} ${medio}, ${a.x2} ${medio}, ${a.x2} ${a.y2}`,
    }));
  }

  // Los nodos se posicionan con cx/cy (sin transform en el <g>) para que
  // las futuras animaciones puedan usar transform: scale() libremente.
  // El <g class="nodo"> contiene solo el círculo y su valor: así su caja
  // (transform-box: fill-box) es exactamente el círculo y cualquier
  // transform: scale() se hace alrededor del centro del nodo.
  const grupoNodos = crear("g", { class: "nodos" });
  const grupoEtiquetas = crear("g", { class: "etiquetas" });
  for (const n of disposicion.nodos) {
    const g = crear("g", {
      class: n.esRaiz ? "nodo nodo-raiz" : "nodo",
      "data-valor": n.valor,
      "data-nivel": n.nivel,
    });
    g.append(
      crear("title", {}, n.esRaiz ? `Raíz: ${n.valor}` : `Nodo ${n.valor} (nivel ${n.nivel})`),
      crear("circle", { class: "disco", cx: n.x, cy: n.y, r: medidas.radio }),
      // Doble línea ornamental (decorativa). pathLength permite dibujarla al brotar.
      crear("circle", { class: "anillo", cx: n.x, cy: n.y, r: medidas.radio - 4, pathLength: 100 }),
      crear("text", { x: n.x, y: n.y }, String(n.valor))
    );
    if (n.esRaiz) {
      grupoEtiquetas.append(crear("text", { x: n.x, y: n.y - medidas.radio - 9, class: "etiqueta-raiz" }, "raíz"));
    }
    grupoNodos.append(g);
  }

  svg.append(grupoAristas, grupoNodos, grupoEtiquetas);
  const total = disposicion.nodos.length;
  svg.setAttribute("aria-label",
    `Árbol binario de búsqueda con ${total} nodo${total === 1 ? "" : "s"} y ` +
    `${disposicion.niveles} nivel${disposicion.niveles === 1 ? "" : "es"}`);
  return disposicion;
}
