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

/* ---------- Interfaz ----------
   elementos: { svg, lienzo, formulario, entrada, mensaje, camino,
                menu, botonCancelar, velocidad, textoVelocidad } */
export function crearInterfaz(elementos) {
  const { svg, lienzo, formulario, entrada, mensaje, camino, menu, botonCancelar, velocidad, textoVelocidad } = elementos;

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

  function redibujar(centrar = false) {
    const disposicion = dibujarArbol(svg, arbol);
    if (centrar) centrarEnRaiz(lienzo, svg, disposicion);
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

  /* ----- Bloqueo: una operación a la vez ----- */

  function bloquear(activo) {
    menu.querySelectorAll("button").forEach((b) => { b.disabled = activo; });
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
        entrada.focus();
        return;
      }
      valor = r.valor;
    }

    enCurso = true;
    bloquear(true);
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

  function agregarGrupo(titulo, operaciones) {
    const grupo = document.createElement("div");
    grupo.className = "grupo-menu";
    grupo.setAttribute("role", "group");
    grupo.setAttribute("aria-label", titulo);
    const encabezado = document.createElement("span");
    encabezado.className = "titulo-grupo";
    encabezado.textContent = titulo;
    grupo.append(encabezado);
    for (const op of operaciones) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = op.principal ? "boton boton-principal" : "boton";
      boton.dataset.operacion = op.id;
      boton.textContent = op.nombre;
      if (op.pideValor) boton.title = "Usa el número del campo «Valor»";
      boton.addEventListener("click", () => correr(op));
      grupo.append(boton);
    }
    menu.append(grupo);
  }

  const OPERACIONES_A = [
    { id: "insertar", nombre: "Insertar", pideValor: true, principal: true, accion: insertar },
    { id: "buscar", nombre: "Buscar", pideValor: true, accion: buscar },
    { id: "eliminar", nombre: "Eliminar", pideValor: true, accion: eliminar },
    { id: "minimo", nombre: "Mínimo", pideValor: false, accion: () => extremo("minimo") },
    { id: "maximo", nombre: "Máximo", pideValor: false, accion: () => extremo("maximo") },
    { id: "mostrar", nombre: "Mostrar árbol", pideValor: false, accion: mostrar },
  ];
  const UTILIDADES = [
    { id: "ejemplo", nombre: "Árbol de ejemplo", pideValor: false, accion: cargarEjemplo },
    { id: "vaciar", nombre: "Vaciar", pideValor: false, accion: vaciar },
  ];

  agregarGrupo("Operaciones", OPERACIONES_A);
  agregarGrupo("Utilidades", UTILIDADES);

  /* Integración con la Parte B. Recibe su objeto con:
       OPCIONES: [{ id, nombre, pideValor }]
       ejecutar(id, arbol, texto) → { ok, texto, nodos }
     Cada opción se agrega como botón, respeta el bloqueo y anima
     `nodos` con el animador compartido. */
  function registrarParteB(parteB, titulo = "Recorridos y más (Parte B)") {
    agregarGrupo(titulo, parteB.OPCIONES.map((op) => ({
      id: op.id,
      nombre: op.nombre,
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
    })));
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
    get arbol() { return arbol; },
    get ocupado() { return enCurso; },
  };
}
