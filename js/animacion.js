/* =========================================================
   Sistema de animaciones compartido (Parte A y Parte B)

   Solo cambia CLASES CSS sobre el dibujo ya hecho por
   arbol-svg.js; nunca modifica el árbol ni redibuja. Los nodos
   se buscan por data-valor en cada paso, así que nunca se guarda
   una referencia a un elemento que pudo haber sido borrado: si un
   valor no está dibujado, el paso simplemente no hace nada.

   ---------------------------------------------------------
   CONTRATO PÚBLICO
   ---------------------------------------------------------
   const animador = new Animador(svg);

   animador.ejecutar(async (a) => { ... })  → Promise<boolean>
       Ejecuta una "sesión" de animación. Antes de empezar cancela
       la sesión anterior y espera a que termine, así que NUNCA hay
       dos animaciones a la vez. Devuelve true si terminó y false si
       se canceló. Dentro de la sesión se usan las herramientas `a`:

         a.secuencia(valores, opciones?)  resalta los nodos uno por uno
              opciones: { clase = "nodo-visitado", conAristas = false,
                          ms = DURACION_PASO, seguir = true }
              El nodo del paso actual lleva "nodo-activo"; al avanzar
              pasa a `clase`. conAristas también resalta la línea entre
              valores consecutivos (útil para caminos padre→hijo).
              seguir desplaza el área para mantener el nodo visible.
         a.esperar(ms = DURACION_PASO)    pausa (ajustada a la velocidad)
         a.marcar(valor, ...clases)       agrega clases a un nodo
         a.desmarcar(valor, ...clases)    quita clases a un nodo
         a.marcarArista(padre, hijo)      resalta una arista
         a.revelarPorNiveles(ms?)         muestra el árbol nivel por nivel
         a.moverValor(desde, hacia, ms?)  una copia del nodo `desde` viaja
                                          hasta la posición de `hacia`
         a.limpiar()                      quita todos los resaltados

       Si la sesión se cancela, la siguiente llamada a cualquier
       herramienta lanza AnimacionCancelada (que ejecutar() atrapa),
       así una sesión vieja nunca toca el dibujo de la nueva.

   animador.resaltarSecuencia(valores, opciones?) → Promise<boolean>
       Atajo: limpia y ejecuta a.secuencia(valores, opciones).
       Es lo que necesitan los recorridos de la Parte B.
   animador.cancelar()            cancela la sesión actual (si hay)
   animador.limpiar()             quita todos los resaltados
   animador.setVelocidad(factor)  0.25 a 4 (1 = normal, 2 = el doble de rápido)
   animador.velocidad             factor actual
   animador.ocupado               true mientras hay una sesión en curso

   Clases CSS (ver CLASES): nodo-activo, nodo-visitado,
   nodo-encontrado, nodo-nuevo, nodo-eliminando, nodo-desvanecer,
   nodo-sucesor, nodo-reemplazo, nodo-oculto, arista-camino,
   arista-oculta.
   ========================================================= */

export const CLASES = Object.freeze({
  activo: "nodo-activo",          // nodo que se está comparando en este momento
  visitado: "nodo-visitado",      // nodo por el que ya se pasó
  encontrado: "nodo-encontrado",  // resultado de una búsqueda, mínimo o máximo
  nuevo: "nodo-nuevo",            // nodo recién insertado (aparece)
  eliminando: "nodo-eliminando",  // nodo que se va a eliminar
  desvanecer: "nodo-desvanecer",  // nodo que desaparece
  sucesor: "nodo-sucesor",        // sucesor inorden (eliminación con dos hijos)
  reemplazo: "nodo-reemplazo",    // nodo que ocupa el lugar del eliminado
  oculto: "nodo-oculto",          // oculto temporalmente (revelar por niveles)
  aristaCamino: "arista-camino",  // arista del camino recorrido
  aristaOculta: "arista-oculta",  // arista oculta temporalmente
});

const TODAS_LAS_CLASES = Object.values(CLASES);
const SELECTOR_RESALTADOS = TODAS_LAS_CLASES.map((c) => "." + c).join(",");

// Duración de un paso a velocidad 1, en milisegundos.
export const DURACION_PASO = 650;

export const VELOCIDAD_MINIMA = 0.25;
export const VELOCIDAD_MAXIMA = 4;

// Error especial que interrumpe una sesión cancelada.
export class AnimacionCancelada extends Error {
  constructor() {
    super("Animación cancelada");
    this.name = "AnimacionCancelada";
  }
}

export class Animador {
  constructor(svg, { velocidad = 1 } = {}) {
    this.svg = svg;
    this.sesion = null;     // sesión en curso: { cancelada, promesa }
    this.velocidad = 1;
    this.setVelocidad(velocidad);
  }

  get ocupado() {
    return this.sesion !== null;
  }

  // Cambia la velocidad. También afecta a las pausas que ya están en curso
  // y, mediante la variable CSS --factor-velocidad, a las transiciones.
  setVelocidad(factor) {
    const numero = Number(factor);
    if (!Number.isFinite(numero) || numero <= 0) return;
    this.velocidad = Math.min(VELOCIDAD_MAXIMA, Math.max(VELOCIDAD_MINIMA, numero));
    this.svg.style.setProperty("--factor-velocidad", String(this.velocidad));
  }

  // Elemento <g class="nodo"> de un valor, o null si no está dibujado.
  nodo(valor) {
    return this.svg.querySelector(`.nodo[data-valor="${CSS.escape(String(valor))}"]`);
  }

  arista(padre, hijo) {
    return this.svg.querySelector(
      `.arista[data-padre="${CSS.escape(String(padre))}"][data-hijo="${CSS.escape(String(hijo))}"]`);
  }

  // Quita todos los resaltados y los elementos temporales de animación.
  limpiar() {
    this.svg.querySelectorAll(SELECTOR_RESALTADOS).forEach((el) => el.classList.remove(...TODAS_LAS_CLASES));
    this.svg.querySelectorAll(".animacion-temporal").forEach((el) => el.remove());
  }

  cancelar() {
    if (this.sesion) this.sesion.cancelada = true;
  }

  async ejecutar(funcion) {
    // Cancelar y esperar a la sesión anterior. Es un ciclo porque, mientras
    // se espera, otra llamada pudo haber iniciado su propia sesión.
    while (this.sesion) {
      this.sesion.cancelada = true;
      await this.sesion.promesa;
    }

    const sesion = { cancelada: false, promesa: null };
    this.sesion = sesion;
    const herramientas = this.crearHerramientas(sesion);

    sesion.promesa = (async () => {
      try {
        await funcion(herramientas);
        return !sesion.cancelada;
      } catch (error) {
        if (error instanceof AnimacionCancelada) return false;
        throw error;
      } finally {
        if (this.sesion === sesion) this.sesion = null;
      }
    })();
    return sesion.promesa;
  }

  resaltarSecuencia(valores, opciones = {}) {
    return this.ejecutar(async (a) => {
      a.limpiar();
      await a.secuencia(valores, opciones);
    });
  }

  /* Herramientas ligadas a UNA sesión. Todas revisan primero si esa
     sesión fue cancelada. */
  crearHerramientas(sesion) {
    const verificar = () => {
      if (sesion.cancelada) throw new AnimacionCancelada();
    };

    // Pausa de `ms` milisegundos "a velocidad 1". Avanza en pasos cortos
    // para responder rápido a una cancelación o a un cambio de velocidad.
    const esperar = async (ms = DURACION_PASO) => {
      verificar();
      let avance = 0;
      let anterior = performance.now();
      while (avance < ms) {
        await new Promise((listo) => setTimeout(listo, 20));
        verificar();
        const ahora = performance.now();
        avance += (ahora - anterior) * this.velocidad;
        anterior = ahora;
      }
    };

    const marcar = (valor, ...clases) => {
      verificar();
      this.nodo(valor)?.classList.add(...clases);
    };

    const desmarcar = (valor, ...clases) => {
      verificar();
      this.nodo(valor)?.classList.remove(...clases);
    };

    const marcarArista = (padre, hijo) => {
      verificar();
      this.arista(padre, hijo)?.classList.add(CLASES.aristaCamino);
    };

    const reducirMovimiento = () =>
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Mantiene visible un nodo desplazando SOLO el área que contiene al SVG
    // (nunca la página), para que en celulares el árbol no "salte" de la vista.
    const seguirNodo = (valor) => {
      const circulo = this.nodo(valor)?.querySelector("circle");
      const area = this.svg.parentElement;
      if (!circulo || !area) return;
      if (area.scrollWidth <= area.clientWidth && area.scrollHeight <= area.clientHeight) return;
      const c = circulo.getBoundingClientRect();
      const a = area.getBoundingClientRect();
      const margen = 28;
      const dx = c.left < a.left + margen ? c.left - a.left - margen
        : c.right > a.left + area.clientWidth - margen ? c.right - (a.left + area.clientWidth) + margen : 0;
      const dy = c.top < a.top + margen ? c.top - a.top - margen
        : c.bottom > a.top + area.clientHeight - margen ? c.bottom - (a.top + area.clientHeight) + margen : 0;
      if (dx !== 0 || dy !== 0) {
        area.scrollBy({ left: dx, top: dy, behavior: reducirMovimiento() ? "auto" : "smooth" });
      }
    };

    const secuencia = async (valores, { clase = CLASES.visitado, conAristas = false, ms = DURACION_PASO, seguir = true } = {}) => {
      for (let i = 0; i < valores.length; i++) {
        if (i > 0) {
          desmarcar(valores[i - 1], CLASES.activo);
          marcar(valores[i - 1], clase);
          if (conAristas) marcarArista(valores[i - 1], valores[i]);
        }
        marcar(valores[i], CLASES.activo);
        if (seguir) seguirNodo(valores[i]);
        await esperar(ms);
      }
      if (valores.length > 0) {
        desmarcar(valores.at(-1), CLASES.activo);
        marcar(valores.at(-1), clase);
      }
    };

    // Oculta todo y lo va mostrando nivel por nivel (raíz = nivel 1).
    const revelarPorNiveles = async (ms = DURACION_PASO * 0.6) => {
      verificar();
      const nodos = [...this.svg.querySelectorAll(".nodo")];
      const aristas = [...this.svg.querySelectorAll(".arista")];
      const etiquetas = [...this.svg.querySelectorAll(".etiquetas")];
      const nivelDe = new Map(nodos.map((n) => [n.dataset.valor, Number(n.dataset.nivel)]));
      nodos.forEach((n) => n.classList.add(CLASES.oculto));
      aristas.forEach((l) => l.classList.add(CLASES.aristaOculta));
      etiquetas.forEach((e) => e.classList.add(CLASES.oculto));

      const maximo = Math.max(0, ...nivelDe.values());
      for (let nivel = 1; nivel <= maximo; nivel++) {
        verificar();
        nodos.filter((n) => Number(n.dataset.nivel) === nivel).forEach((n) => n.classList.remove(CLASES.oculto));
        aristas.filter((l) => nivelDe.get(l.dataset.hijo) === nivel).forEach((l) => l.classList.remove(CLASES.aristaOculta));
        if (nivel === 1) etiquetas.forEach((e) => e.classList.remove(CLASES.oculto));
        await esperar(ms);
      }
    };

    // Crea una copia temporal del nodo `desde` y la desplaza hasta `hacia`.
    const moverValor = async (desde, hacia, ms = DURACION_PASO * 1.2) => {
      verificar();
      const origen = this.nodo(desde)?.querySelector("circle");
      const destino = this.nodo(hacia)?.querySelector("circle");
      if (!origen || !destino) return;
      const x = Number(origen.getAttribute("cx"));
      const y = Number(origen.getAttribute("cy"));
      const dx = Number(destino.getAttribute("cx")) - x;
      const dy = Number(destino.getAttribute("cy")) - y;

      const ns = "http://www.w3.org/2000/svg";
      const copia = document.createElementNS(ns, "g");
      copia.setAttribute("class", "animacion-temporal valor-en-movimiento");
      copia.setAttribute("aria-hidden", "true");
      const circulo = document.createElementNS(ns, "circle");
      circulo.setAttribute("cx", x);
      circulo.setAttribute("cy", y);
      circulo.setAttribute("r", origen.getAttribute("r"));
      const texto = document.createElementNS(ns, "text");
      texto.setAttribute("x", x);
      texto.setAttribute("y", y);
      texto.textContent = String(desde);
      copia.append(circulo, texto);
      this.svg.append(copia);

      copia.getBoundingClientRect(); // fuerza al navegador a registrar la posición inicial
      copia.style.transform = `translate(${dx}px, ${dy}px)`;
      await esperar(ms);
    };

    return {
      esperar,
      marcar,
      desmarcar,
      marcarArista,
      secuencia,
      revelarPorNiveles,
      moverValor,
      verificar,
      limpiar: () => {
        verificar();
        this.limpiar();
      },
    };
  }
}
