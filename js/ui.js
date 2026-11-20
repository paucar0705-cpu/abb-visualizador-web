/* =========================================================
   Interfaz de la Parte A
   Persona A

   Conecta los controles con el ABB, el dibujo y el animador.
   Reglas que sigue cada operación:
     1. La entrada se valida COMPLETA antes de convertirla a número.
     2. Solo puede haber una operación a la vez: mientras una corre,
        los botones se desactivan y solo se puede Cancelar.
     3. Primero se anima sobre el dibujo ACTUAL y después se modifica
        el árbol (en un único punto) y se redibuja.
     4. Si se cancela, se redibuja desde el árbol lógico, así el
        dibujo siempre coincide con el estado real.

   Para la Parte B: registrarParteB(ParteB) agrega sus opciones al
   menú usando su contrato OPCIONES + ejecutar(id, arbol, texto).
   ========================================================= */

import { ABB, esValorValido, VALOR_MINIMO, VALOR_MAXIMO } from "./abb.js";
import { dibujarArbol, centrarEnRaiz } from "./arbol-svg.js";
import { Animador, CLASES, DURACION_PASO } from "./animacion.js";

export const EJEMPLO = [50, 30, 70, 20, 40, 60, 80, 35, 45, 65];

/* ---------- Validación de la entrada (sin DOM) ----------
   texto: lo que el usuario escribió.
   entradaIlegible: true si el navegador no pudo interpretar el campo
   (en <input type="number"> el valor llega vacío en ese caso).
   Devuelve { valor, error }: uno de los dos es null. */
export function interpretarEntrada(texto, entradaIlegible = false) {
  const limpio = String(texto ?? "").trim();
  const rango = `un número entero entre ${VALOR_MINIMO} y ${VALOR_MAXIMO}`;

  if (entradaIlegible) return { valor: null, error: `Eso no es un número. Escribe ${rango}.` };
  if (limpio === "") return { valor: null, error: `El campo «Valor» está vacío. Escribe ${rango}.` };
  // Solo dígitos con un signo menos opcional: rechaza "3.5", "1e2", "0x10", " 5 6"...
  if (!/^-?\d+$/.test(limpio)) return { valor: null, error: `«${limpio}» no es un número entero. Escribe ${rango}.` };

  const numero = Number(limpio);
  const valor = numero === 0 ? 0 : numero; // convierte -0 en 0
  if (!esValorValido(valor)) {
    return { valor: null, error: `El ${limpio} está fuera del rango permitido (de ${VALOR_MINIMO} a ${VALOR_MAXIMO}).` };
  }
  return { valor, error: null };
}

const plural = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;
const flechas = (valores) => valores.join(" → ");

/* ---------- Secciones del menú ----------
   Las secciones de la Parte B muestran solo una nota (sin botones)
   hasta que se llame a registrarParteB(). */
const SECCIONES = [
  { id: "operaciones", titulo: "Operaciones" },
  { id: "consultas", titulo: "Consultas", pendiente: "Niveles del árbol y nivel de un nodo: llegan con la Parte B." },
  { id: "recorridos", titulo: "Recorridos", pendiente: "Por niveles, preorden, inorden y postorden: llegan con la Parte B." },
  { id: "adicionales", titulo: "Operaciones adicionales", pendiente: "Llegan con la Parte B." },
];

// Nombres cortos para los botones de la Parte B (el nombre completo queda
// como descripción emergente). Una opción puede traer su propio `nombreCorto`.
const NOMBRES_CORTOS_PARTE_B = {
  anchura: "Por niveles", preorden: "Preorden", inorden: "Inorden", postorden: "Postorden",
  niveles: "Niveles", nivelDe: "Nivel de nodo",
  contar: "Nodos y hojas", suma: "Suma", camino: "Camino",
};

// Niveles de zoom disponibles (1 = tamaño real)
const NIVELES_ZOOM = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2];
const ZOOM_MINIMO = 0.25;
const ZOOM_MAXIMO = 2;

// Sección e ícono de cada opción conocida de la Parte B (una opción
// puede indicar su propia `categoria`; si no, va a "adicionales").
const CATEGORIAS_PARTE_B = {
  anchura: "recorridos", preorden: "recorridos", inorden: "recorridos", postorden: "recorridos",
  niveles: "consultas", nivelDe: "consultas",
};
const ICONO_POR_SECCION = { recorridos: "i-recorrido", consultas: "i-consulta", adicionales: "i-adicional", operaciones: "i-adicional" };

// Crea <svg class="icono"><use href="#id"/></svg> (íconos del sprite de index.html).
function crearIcono(id) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "icono");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const uso = document.createElementNS(ns, "use");
  uso.setAttribute("href", `#${id}`);
  svg.append(uso);
  return svg;
}

/* ---------- Interfaz ----------
   elementos: { svg, lienzo, formulario, entrada, mensaje, camino,
                menu, utilidades?, resumen?, botonCancelar,
                velocidad, textoVelocidad } */
export function crearInterfaz(elementos) {
  const { svg, lienzo, formulario, entrada, mensaje, camino, menu, botonCancelar, velocidad, textoVelocidad } = elementos;
  const contenedorUtilidades = elementos.utilidades ?? menu;
  const resumen = elementos.resumen ?? null;

  let arbol = new ABB();
  let enCurso = false;
  const animador = new Animador(svg, { velocidad: Number(velocidad.value) || 1 });

  /* ----- Auxiliares de presentación ----- */

  function mostrarMensaje(texto, tipo = "info") {
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo}`;
  }

  function mostrarCamino(valores, titulo = "Camino recorrido") {
    if (!valores || valores.length === 0) {
      camino.hidden = true;
      camino.textContent = "";
      return;
    }
    camino.hidden = false;
    camino.textContent = `${titulo}: ${flechas(valores)}`;
  }

  /* ----- Zoom: solo cambia el tamaño en pantalla del <svg> (width/height);
     el viewBox, las coordenadas y las animaciones no cambian. ----- */
  const controlesZoom = elementos.zoom ?? null;
  let zoom = 1;

  function aplicarZoom() {
    const caja = svg.viewBox.baseVal;
    if (!caja || caja.width === 0) return;
    const factor = svg.querySelector(".estado-vacio") ? 1 : zoom; // el aviso de árbol vacío no se escala
    svg.setAttribute("width", Math.round(caja.width * factor));
    svg.setAttribute("height", Math.round(caja.height * factor));
    if (controlesZoom) {
      controlesZoom.texto.textContent = `${Math.round(zoom * 100)}%`;
      controlesZoom.alejar.disabled = zoom <= ZOOM_MINIMO + 0.001;
      controlesZoom.acercar.disabled = zoom >= ZOOM_MAXIMO - 0.001;
    }
  }

  // Cambia el zoom manteniendo en el centro del área lo que se estaba viendo.
  function cambiarZoom(nuevo) {
    nuevo = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, nuevo));
    const proporcion = nuevo / zoom;
    const centroX = lienzo.scrollLeft + lienzo.clientWidth / 2;
    const centroY = lienzo.scrollTop + lienzo.clientHeight / 2;
    zoom = nuevo;
    aplicarZoom();
    lienzo.scrollLeft = centroX * proporcion - lienzo.clientWidth / 2;
    lienzo.scrollTop = centroY * proporcion - lienzo.clientHeight / 2;
  }

  // Zoom para que el árbol completo quepa en el área (sin agrandarlo de más).
  function ajustarZoom() {
    const caja = svg.viewBox.baseVal;
    if (!caja || caja.width === 0 || svg.querySelector(".estado-vacio")) return;
    const estilo = getComputedStyle(lienzo);
    const relleno = (lado) => parseFloat(estilo[`padding${lado}`]) || 0;
    const anchoDisponible = lienzo.clientWidth - relleno("Left") - relleno("Right");
    const altoMaximo = parseFloat(estilo.maxHeight) || lienzo.clientHeight;
    const altoDisponible = altoMaximo - relleno("Top") - relleno("Bottom") - 4;
    zoom = Math.min(1, Math.max(ZOOM_MINIMO, Math.min(anchoDisponible / caja.width, altoDisponible / caja.height)));
    aplicarZoom();
    lienzo.scrollLeft = 0;
    lienzo.scrollTop = 0;
  }

  if (controlesZoom) {
    controlesZoom.acercar.addEventListener("click", () =>
      cambiarZoom(NIVELES_ZOOM.find((z) => z > zoom + 0.001) ?? ZOOM_MAXIMO));
    controlesZoom.alejar.addEventListener("click", () =>
      cambiarZoom([...NIVELES_ZOOM].reverse().find((z) => z < zoom - 0.001) ?? ZOOM_MINIMO));
    controlesZoom.ajustar.addEventListener("click", ajustarZoom);
    controlesZoom.centrar.addEventListener("click", () => {
      zoom = 1;
      aplicarZoom();
      centrarEnRaiz(lienzo, svg, ultimaDisposicion);
    });
  }

  let ultimaDisposicion = null;

  function redibujar(centrar = false) {
    const disposicion = dibujarArbol(svg, arbol);
    ultimaDisposicion = disposicion;
    aplicarZoom();
    if (centrar) centrarEnRaiz(lienzo, svg, disposicion);
    if (resumen) {
      resumen.textContent = disposicion.nodos.length === 0
        ? "Sin elementos"
        : `${plural(disposicion.nodos.length, "elemento", "elementos")} · ` +
          `${plural(disposicion.niveles, "nivel", "niveles")} · raíz ${arbol.raiz.valor}`;
    }
    return disposicion;
  }

  // Se llama cuando una animación se cancela: el dibujo vuelve a
  // reflejar exactamente el árbol lógico.
  function cancelado(modificado) {
    redibujar();
    mostrarCamino([]);
    mostrarMensaje(modificado
      ? "Se canceló la animación. La operación ya se había aplicado y el dibujo muestra el árbol actualizado."
      : "Operación cancelada. El árbol no cambió.", "aviso");
  }

  // En pantallas pequeñas el panel queda arriba del árbol: si la nota de
  // resultados no se ve, se desplaza la página hasta ella. En escritorio
  // siempre está visible y no pasa nada.
  function asegurarResultadosVisibles() {
    const zona = mensaje.parentElement ?? mensaje;
    const caja = zona.getBoundingClientRect();
    if (caja.top >= 0 && caja.bottom <= window.innerHeight) return;
    const reducir = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    zona.scrollIntoView({ block: "start", behavior: reducir ? "auto" : "smooth" });
  }

  /* ----- Bloqueo: una operación a la vez ----- */

  function bloquear(activo) {
    document.querySelectorAll("button[data-operacion]").forEach((b) => { b.disabled = activo; });
    botonCancelar.disabled = !activo;
    lienzo.setAttribute("aria-busy", String(activo));
    document.body.classList.toggle("operacion-en-curso", activo);
  }

  async function correr(operacion) {
    if (enCurso) return; // ya hay una operación; se ignora el clic

    let valor = null;
    if (operacion.pideValor) {
      const r = interpretarEntrada(entrada.value, entrada.validity?.badInput === true);
      if (r.error) {
        mostrarMensaje(r.error, "error");
        mostrarCamino([]);
        asegurarResultadosVisibles();
        entrada.focus({ preventScroll: true });
        return;
      }
      valor = r.valor;
    }

    enCurso = true;
    bloquear(true);
    asegurarResultadosVisibles();
    try {
      await operacion.accion(valor, entrada.value.trim());
    } catch (error) {
      console.error(error);
      redibujar();
      mostrarMensaje("Ocurrió un error inesperado. El dibujo se actualizó con el estado real del árbol.", "error");
    } finally {
      enCurso = false;
      bloquear(false);
    }
  }

  /* ----- Operaciones de la Parte A ----- */

  // 1. Imprimir (mostrar) el árbol de manera gráfica, nivel por nivel.
  async function mostrar() {
    mostrarCamino([]);
    if (arbol.estaVacio()) {
      redibujar();
      mostrarMensaje("El árbol está vacío: todavía no hay elementos que mostrar.", "info");
      return;
    }
    const d = redibujar(true);
    mostrarMensaje("Dibujando el árbol nivel por nivel…", "info");
    const completo = await animador.ejecutar((a) => a.revelarPorNiveles());
    if (!completo) return cancelado(false);
    mostrarMensaje(`El árbol tiene ${plural(d.nodos.length, "elemento", "elementos")} en ` +
      `${plural(d.niveles, "nivel", "niveles")}. La raíz es el ${arbol.raiz.valor}.`, "exito");
  }

  // 2. Buscar
  async function buscar(valor) {
    if (arbol.estaVacio()) {
      animador.limpiar();
      mostrarCamino([]);
      mostrarMensaje(`El árbol está vacío, así que el ${valor} no puede estar en él.`, "info");
      return;
    }
    const r = arbol.buscar(valor);
    mostrarCamino([]);
    mostrarMensaje(`Buscando el ${valor}: en cada nodo se va a la izquierda si es menor y a la derecha si es mayor…`, "info");

    const completo = await animador.ejecutar(async (a) => {
      a.limpiar();
      await a.secuencia(r.camino, { conAristas: true });
      if (r.encontrado) a.marcar(valor, CLASES.encontrado);
    });
    if (!completo) return cancelado(false);

    mostrarCamino(r.camino);
    if (r.encontrado) {
      mostrarMensaje(`Se encontró el ${valor} en el nivel ${r.camino.length}, después de ` +
        `${plural(r.camino.length, "comparación", "comparaciones")}.`, "exito");
    } else {
      const ultimo = r.camino.at(-1);
      const lado = valor < ultimo ? "izquierda" : "derecha";
      mostrarMensaje(`El ${valor} no está en el árbol. Debería estar a la ${lado} del ${ultimo}, ` +
        `pero ese lugar está vacío.`, "aviso");
    }
  }

  // 3. Insertar
  async function insertar(valor) {
    const estabaVacio = arbol.estaVacio();
    const previa = arbol.buscar(valor); // camino de comparación, sin modificar nada
    let modificado = false;
    mostrarCamino([]);
    mostrarMensaje(estabaVacio ? `Insertando el ${valor}…` : `Insertando el ${valor}: se compara desde la raíz…`, "info");

    const completo = await animador.ejecutar(async (a) => {
      a.limpiar();
      await a.secuencia(previa.camino, { conAristas: true });
      if (previa.encontrado) {
        a.marcar(valor, CLASES.encontrado);
        return;
      }
      // Único punto donde cambia el árbol
      arbol.insertar(valor);
      modificado = true;
      redibujar(estabaVacio);
      // El dibujo es nuevo: se vuelve a marcar el camino y el nodo nuevo.
      previa.camino.forEach((v) => a.marcar(v, CLASES.visitado));
      for (let i = 1; i < previa.camino.length; i++) a.marcarArista(previa.camino[i - 1], previa.camino[i]);
      if (previa.camino.length > 0) a.marcarArista(previa.camino.at(-1), valor);
      a.marcar(valor, CLASES.nuevo);
      await a.esperar(DURACION_PASO);
    });
    if (!completo) return cancelado(modificado);

    mostrarCamino(previa.camino, "Comparaciones");
    if (previa.encontrado) {
      mostrarMensaje(`El ${valor} ya está en el árbol, así que no se insertó (no se permiten duplicados).`, "aviso");
    } else if (estabaVacio) {
      mostrarMensaje(`Se insertó el ${valor} como raíz del árbol.`, "exito");
    } else {
      const padre = previa.camino.at(-1);
      const lado = valor < padre ? "izquierdo" : "derecho";
      mostrarMensaje(`Se insertó el ${valor} como hijo ${lado} del ${padre}.`, "exito");
    }
  }

  // 4. Eliminar
  async function eliminar(valor) {
    if (arbol.estaVacio()) {
      animador.limpiar();
      mostrarCamino([]);
      mostrarMensaje(`El árbol está vacío: no hay ningún ${valor} que eliminar.`, "info");
      return;
    }
    const plan = arbol.analizarEliminacion(valor); // qué pasará, sin modificar nada
    let modificado = false;
    mostrarCamino([]);
    mostrarMensaje(`Buscando el ${valor} para eliminarlo…`, "info");

    const completo = await animador.ejecutar(async (a) => {
      a.limpiar();
      await a.secuencia(plan.camino, { conAristas: true });
      if (!plan.eliminable) return;

      a.desmarcar(valor, CLASES.visitado);
      a.marcar(valor, CLASES.eliminando);

      if (plan.caso === "hoja") {
        mostrarMensaje(`El ${valor} es una hoja (no tiene hijos): basta con quitarlo.`, "info");
        await a.esperar();
        a.marcar(valor, CLASES.desvanecer);
        await a.esperar();
      } else if (plan.caso === "unHijo") {
        mostrarMensaje(`El ${valor} tiene un solo hijo, el ${plan.reemplazo}, que ocupará su lugar.`, "info");
        a.marcar(plan.reemplazo, CLASES.reemplazo);
        a.marcarArista(valor, plan.reemplazo);
        await a.esperar(DURACION_PASO * 1.5);
        a.marcar(valor, CLASES.desvanecer);
        await a.esperar();
      } else {
        mostrarMensaje(`El ${valor} tiene dos hijos. Se busca su sucesor inorden: ` +
          "el menor del subárbol derecho (una vez a la derecha y luego siempre a la izquierda).", "info");
        await a.esperar();
        a.marcarArista(valor, plan.caminoSucesor[0]);
        await a.secuencia(plan.caminoSucesor, { conAristas: true });
        a.desmarcar(plan.reemplazo, CLASES.visitado);
        a.marcar(plan.reemplazo, CLASES.sucesor);
        mostrarMensaje(`El sucesor es el ${plan.reemplazo}. Su valor sube al lugar del ${valor} ` +
          `y el nodo original del ${plan.reemplazo} se quita.`, "info");
        await a.esperar();
        await a.moverValor(plan.reemplazo, valor);
        a.marcar(plan.reemplazo, CLASES.desvanecer);
        await a.esperar(DURACION_PASO * 0.6);
      }

      // Único punto donde cambia el árbol
      arbol.eliminar(valor);
      modificado = true;
      redibujar();
      // En el dibujo nuevo el valor eliminado ya no existe: solo se marca el reemplazo.
      if (plan.reemplazo !== null) a.marcar(plan.reemplazo, CLASES.reemplazo);
    });
    if (!completo) return cancelado(modificado);

    mostrarCamino(plan.camino);
    if (!plan.eliminable) {
      mostrarMensaje(`El ${valor} no está en el árbol, así que no se eliminó nada.`, "aviso");
    } else if (plan.caso === "hoja") {
      mostrarMensaje(`Se eliminó el ${valor}. Era una hoja, así que solo se quitó del árbol.`, "exito");
    } else if (plan.caso === "unHijo") {
      mostrarMensaje(`Se eliminó el ${valor}. Su único hijo, el ${plan.reemplazo}, ocupó su lugar.`, "exito");
    } else {
      mostrarMensaje(`Se eliminó el ${valor}. Su sucesor inorden, el ${plan.reemplazo}, tomó su lugar.`, "exito");
    }
  }

  // 5 y 6. Mínimo y máximo
  async function extremo(tipo) {
    const esMinimo = tipo === "minimo";
    const nombre = esMinimo ? "mínimo" : "máximo";
    if (arbol.estaVacio()) {
      animador.limpiar();
      mostrarCamino([]);
      mostrarMensaje(`El árbol está vacío, así que no tiene valor ${nombre}.`, "info");
      return;
    }
    const valor = esMinimo ? arbol.minimo() : arbol.maximo();
    const recorrido = arbol.buscar(valor).camino; // camino real desde la raíz hasta el extremo
    const lado = esMinimo ? "izquierda" : "derecha";
    mostrarCamino([]);
    mostrarMensaje(`Buscando el ${nombre}: se baja siempre por la ${lado}…`, "info");

    const completo = await animador.ejecutar(async (a) => {
      a.limpiar();
      await a.secuencia(recorrido, { conAristas: true });
      a.marcar(valor, CLASES.encontrado);
    });
    if (!completo) return cancelado(false);

    mostrarCamino(recorrido);
    mostrarMensaje(recorrido.length === 1
      ? `El ${nombre} es el ${valor}: la raíz no tiene hijo ${esMinimo ? "izquierdo" : "derecho"}.`
      : `El ${nombre} es el ${valor}: el nodo más a la ${lado}.`, "exito");
  }

  /* ----- Utilidades ----- */

  async function cargarEjemplo() {
    arbol = new ABB();
    EJEMPLO.forEach((v) => arbol.insertar(v));
    animador.limpiar();
    redibujar(true);
    mostrarCamino([]);
    mostrarMensaje(`Se cargó un árbol de ejemplo con ${EJEMPLO.length} elementos.`, "exito");
  }

  async function vaciar() {
    arbol = new ABB();
    redibujar();
    mostrarCamino([]);
    mostrarMensaje("Se vació el árbol.", "exito");
  }

  /* ----- Menú construido a partir de datos ----- */

  function crearBoton(op) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = op.principal ? "boton boton-principal" : "boton";
    boton.dataset.operacion = op.id;
    if (op.icono) boton.append(crearIcono(op.icono));
    const texto = document.createElement("span");
    texto.textContent = op.nombre;
    boton.append(texto);
    if (op.descripcion) boton.title = op.descripcion;
    else if (op.pideValor) boton.title = "Usa el número del campo «Valor»";
    boton.addEventListener("click", () => correr(op));
    return boton;
  }

  // Crea las secciones vacías del menú: { id: { seccion, botones, nota } }
  const secciones = {};
  for (const s of SECCIONES) {
    const seccion = document.createElement("section");
    seccion.className = "seccion-menu";
    seccion.dataset.seccion = s.id;
    const titulo = document.createElement("h3");
    titulo.className = "titulo-seccion";
    titulo.id = `seccion-${s.id}`;
    titulo.textContent = s.titulo;
    const botones = document.createElement("div");
    botones.className = "botones";
    botones.setAttribute("role", "group");
    botones.setAttribute("aria-labelledby", titulo.id);
    seccion.append(titulo, botones);
    let nota = null;
    if (s.pendiente) {
      nota = document.createElement("p");
      nota.className = "pendiente";
      nota.textContent = s.pendiente;
      seccion.append(nota);
    }
    menu.append(seccion);
    secciones[s.id] = { seccion, botones, nota };
  }

  function agregarASeccion(id, operaciones) {
    const destino = secciones[id] ?? secciones.adicionales;
    operaciones.forEach((op) => destino.botones.append(crearBoton(op)));
    if (destino.nota) { destino.nota.remove(); destino.nota = null; }
  }

  const OPERACIONES_A = [
    { id: "insertar", nombre: "Insertar", icono: "i-insertar", pideValor: true, principal: true, accion: insertar },
    { id: "buscar", nombre: "Buscar", icono: "i-buscar", pideValor: true, accion: buscar },
    { id: "eliminar", nombre: "Eliminar", icono: "i-eliminar", pideValor: true, accion: eliminar },
    { id: "mostrar", nombre: "Mostrar árbol", icono: "i-mostrar", pideValor: false, accion: mostrar },
  ];
  const CONSULTAS_A = [
    { id: "minimo", nombre: "Mínimo", icono: "i-minimo", pideValor: false, accion: () => extremo("minimo") },
    { id: "maximo", nombre: "Máximo", icono: "i-maximo", pideValor: false, accion: () => extremo("maximo") },
  ];
  const UTILIDADES = [
    { id: "ejemplo", nombre: "Árbol de ejemplo", icono: "i-ejemplo", pideValor: false, accion: cargarEjemplo },
    { id: "vaciar", nombre: "Vaciar", icono: "i-vaciar", pideValor: false, accion: vaciar },
  ];

  agregarASeccion("operaciones", OPERACIONES_A);
  // Las consultas de A se agregan sin quitar la nota de las consultas pendientes de B.
  CONSULTAS_A.forEach((op) => secciones.consultas.botones.append(crearBoton(op)));
  UTILIDADES.forEach((op) => contenedorUtilidades.append(crearBoton(op)));

  /* Integración con la Parte B. Recibe un objeto (o el módulo completo,
     con import * as ParteB) que tenga:
       OPCIONES: [{ id, nombre, pideValor, categoria? }]
       ejecutar(id, arbol, texto) → { ok, texto, nodos }
     Cada opción se agrega como botón en su sección, respeta el bloqueo
     y anima `nodos` con el animador compartido. */
  function registrarParteB(parteB) {
    const porSeccion = {};
    for (const op of parteB.OPCIONES) {
      const seccion = op.categoria ?? CATEGORIAS_PARTE_B[op.id] ?? "adicionales";
      const corto = op.nombreCorto ?? NOMBRES_CORTOS_PARTE_B[op.id] ?? op.nombre;
      (porSeccion[seccion] ??= []).push({
        id: op.id,
        nombre: corto,
        descripcion: corto !== op.nombre ? op.nombre : undefined,
        icono: ICONO_POR_SECCION[seccion] ?? "i-adicional",
        pideValor: op.pideValor,
        accion: async (valor, texto) => {
          mostrarCamino([]);
          const r = parteB.ejecutar(op.id, arbol, op.pideValor ? String(valor) : texto);
          mostrarMensaje(r.texto, r.ok ? "exito" : "aviso");
          if (!r.ok || r.nodos.length === 0) {
            animador.limpiar();
            return;
          }
          const completo = await animador.resaltarSecuencia(r.nodos);
          if (!completo) cancelado(false);
        },
      });
    }
    for (const [seccion, operaciones] of Object.entries(porSeccion)) agregarASeccion(seccion, operaciones);
  }

  /* ----- Eventos ----- */

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    correr(OPERACIONES_A[0]); // Enter en el campo = Insertar
  });

  botonCancelar.addEventListener("click", () => animador.cancelar());
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && enCurso) animador.cancelar();
  });

  const actualizarVelocidad = () => {
    animador.setVelocidad(velocidad.value);
    textoVelocidad.textContent = `${animador.velocidad}×`;
  };
  velocidad.addEventListener("input", actualizarVelocidad);
  actualizarVelocidad();

  bloquear(false);
  redibujar();
  mostrarMensaje("Escribe un número y elige una operación, o carga el árbol de ejemplo.", "info");

  return {
    animador,
    registrarParteB,
    get zoom() { return zoom; },
    get arbol() { return arbol; },
    get ocupado() { return enCurso; },
  };
}
