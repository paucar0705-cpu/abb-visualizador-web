# Visualizador ABB · Árbol binario de búsqueda

Visualizador de un **Árbol Binario de Búsqueda (ABB)** · Actividad 2 (DSM 4A).
Inserción, búsqueda, eliminación, recorridos y otras operaciones, con representación gráfica y animada en SVG.

Tecnologías: HTML5, CSS3, JavaScript vanilla con **módulos ES** y **SVG**. Sin frameworks ni dependencias.
Las tipografías se cargan desde Google Fonts: Fraunces (serif editorial) para los títulos y Source Sans 3 para
la interfaz; si no están disponibles, se usan alternativas locales (Palatino, Georgia, Segoe UI, system-ui).
Los íconos y el sello del encabezado son SVG en línea dentro de `index.html`, sin imágenes.
Estética editorial retro suave: fondo #ECE8DF, paneles #F7F3EC y #E4DED2, lienzo #FBF8F2; oliva #6F775B para la
estructura, coral #C97A5B y rosa viejo #D9B2A6 como acentos, borgoña #7B4A5A y dorado mate #B59A6A para detalles.
Los grupos del panel se numeran (01 Entrada … 06 Reproducción) y los tamaños de letra son responsivos (`clamp`).

## Cómo ejecutarlo

Los módulos ES **no funcionan abriendo el HTML con doble clic** (`file://`); hace falta un servidor HTTP local.
Desde la carpeta del proyecto, usa cualquiera de estas opciones:

```bash
python -m http.server 8000      # luego abre http://localhost:8000/
npx serve .                     # alternativa con Node
```

También funciona con la extensión *Live Server* de VS Code y con GitHub Pages.

- Pruebas de la Parte A: `http://localhost:8000/pruebas/prueba-parteA.html`
- Pruebas de la Parte B: `http://localhost:8000/pruebas/prueba-parteB.html`

## División del trabajo

| Persona A | Persona B |
|---|---|
| Clase `Nodo` y clase `ABB` | Recorrido por niveles (con cola) |
| Representación gráfica (SVG) | Preorden, inorden y postorden |
| Búsqueda con camino resaltado | Número de niveles |
| Inserción con animación | Nivel de un nodo |
| Eliminación (hoja, un hijo, dos hijos) | Tres operaciones libres (por acordar) |
| Operaciones libres: mínimo y máximo | |
| Diseño general, menú, colores y efectos | |

## Convenciones acordadas

- Solo se aceptan **números enteros entre -999 y 999** (tipo `number`; la interfaz convierte el texto del `<input>`).
- **No se permiten duplicados.**
- La **raíz está en el nivel 1**. Un árbol vacío tiene **0 niveles**. Un nodo inexistente tiene **nivel -1**.
- Atributos: `valor`, `izquierdo`, `derecho` (en `Nodo`) y `raiz` (en `ABB`).
- La eliminación con dos hijos usa el **sucesor inorden** (el menor del subárbol derecho).
- La lógica del ABB **no usa el DOM**: los métodos devuelven datos y la interfaz decide cómo mostrarlos.
- Hay **un único sistema de animaciones** compartido.
- Por ahora, el SVG se **redibuja completo** después de cada modificación.
- El área del árbol permite **desplazamiento** cuando el árbol no cabe.

## Estructura de archivos

```
index.html               A   Encabezado, panel de controles, escena del árbol, leyenda e íconos SVG
css/estilos.css          A   Paleta, estilos del árbol, estados y animaciones
js/
  nodo.js                A   export class Nodo
  abb.js                 A   export class ABB (+ VALOR_MINIMO, VALOR_MAXIMO, esValorValido)
  abb-parteB.js          B   Métodos de la Parte B sobre ABB.prototype
  arbol-svg.js           A   Cálculo de posiciones y dibujo SVG
  animacion.js           A+B Animador compartido
  ui.js                  A   Operaciones de la Parte A, validación de entrada y menú
  ui-parteB.js           B   Opciones de la Parte B para el menú
  main.js                A   Punto de entrada
pruebas/
  casos-parteA.js        A   Casos de prueba de la clase ABB (sin DOM)
  prueba-parteA.html     A   Muestra los resultados de casos-parteA.js
  casos-grafica.js       A   Escenarios y pruebas del cálculo de posiciones (sin DOM)
  prueba-grafica.html    A   Dibuja los escenarios y prueba el SVG generado
  casos-interfaz.js      A   Pruebas de la validación de entrada (sin DOM)
  prueba-animacion.html  A   Pruebas del animador en el navegador (y de casos-interfaz.js)
  prueba-parteB.html     B
  abb-temporal.js        B   ABB provisional; se elimina al integrar js/abb.js
```

## Contratos

### `Nodo` (`js/nodo.js`)

```js
export class Nodo {
  valor      // number (entero)
  izquierdo  // Nodo | null  (valores menores)
  derecho    // Nodo | null  (valores mayores)
}
```

### `ABB` (`js/abb.js`), Persona A

```js
import { ABB, esValorValido, VALOR_MINIMO, VALOR_MAXIMO } from "./abb.js";

esValorValido(valor)  // → boolean: entero de tipo number entre -999 y 999

class ABB {
  raiz                // Nodo | null
  estaVacio()         // → boolean
  insertar(valor)     // → { insertado, camino, motivo }
  buscar(valor)       // → { encontrado, camino, motivo }
  eliminar(valor)     // → { eliminado, caso, camino, reemplazo, motivo }
  analizarEliminacion(valor)  // → { eliminable, caso, camino, reemplazo, caminoSucesor, motivo }
                              //   dice qué haría eliminar() SIN modificar el árbol
  minimo()            // → number | null (null si está vacío)
  maximo()            // → number | null
}
```

`analizarEliminacion` permite mostrar el estado **anterior** antes de eliminar. Sus campos significan lo mismo
que en `eliminar` y además incluye `caminoSucesor`: en el caso `"dosHijos"`, los valores desde el hijo derecho del
nodo hasta el sucesor inorden (el último es el sucesor); en los demás casos, `[]`.

**`camino`**: arreglo con los **valores de los nodos ya existentes que se compararon**, en orden, desde la raíz:

| Método | Caso | Último elemento del camino |
|---|---|---|
| `insertar` | éxito | el padre del nodo nuevo (el valor nuevo **no** se incluye; árbol vacío → `[]`) |
| `insertar` | duplicado | el nodo con el mismo valor |
| `buscar` | encontrado | el nodo encontrado |
| `buscar` / `eliminar` | inexistente | el último nodo comparado antes de llegar a `null` (árbol vacío → `[]`) |
| `eliminar` | éxito | el nodo eliminado |
| cualquiera | inválido | `[]` (no se recorre nada) |

**`motivo`**: los métodos no lanzan excepciones por datos del usuario; indican por qué fallaron.

| `motivo` | Significado |
|---|---|
| `null` | La operación tuvo éxito |
| `"invalido"` | El valor no es un entero entre -999 y 999 |
| `"duplicado"` | (`insertar`) el valor ya existe |
| `"inexistente"` | (`buscar`, `eliminar`) el valor no está en el árbol |

Cuando una operación falla, **el árbol no se modifica**.

**`eliminar`**, campos adicionales:

| `caso` | Qué pasa | `reemplazo` |
|---|---|---|
| `"hoja"` | El padre apunta a `null` | `null` |
| `"unHijo"` | El único hijo ocupa el lugar del nodo | valor de ese hijo |
| `"dosHijos"` | Se copia el valor del sucesor inorden en el nodo y se elimina el sucesor | valor del sucesor |
| `null` | La operación falló | `null` |

Ejemplo:

```js
const arbol = new ABB();
[50, 30, 70, 20, 40].forEach((v) => arbol.insertar(v));
arbol.buscar(40);    // { encontrado: true,  camino: [50, 30, 40], motivo: null }
arbol.insertar(30);  // { insertado: false, camino: [50, 30], motivo: "duplicado" }
arbol.eliminar(30);  // { eliminado: true, caso: "dosHijos", camino: [50, 30], reemplazo: 40, motivo: null }
```

### Parte B (`js/abb-parteB.js`)

```js
recorridoAnchura()  preorden()  inorden()  postorden()   // → number[]
numeroNiveles()     // → number (vacío = 0, solo raíz = 1)
nivelDe(valor)      // → number (raíz = 1) | -1 si no existe
// + tres operaciones libres (por acordar)
```

### Dibujo (`js/arbol-svg.js`), Persona A

```js
import { dibujarArbol, calcularPosiciones, centrarEnRaiz, MEDIDAS } from "./arbol-svg.js";

calcularPosiciones(raiz)        // → { nodos, aristas, ancho, alto, niveles }  (sin DOM)
dibujarArbol(svg, arbol)        // redibuja todo el SVG y devuelve lo mismo que calcularPosiciones
centrarEnRaiz(contenedor, svg, disposicion)  // desplaza el área para mostrar la raíz
```

- **x**: posición del nodo en el recorrido inorden (una columna por nodo, así nunca se enciman).
- **y**: nivel del nodo (la raíz es el nivel 1).
- El `<svg>` mide exactamente lo que el dibujo; su contenedor `.lienzo` tiene `overflow: auto`.

### Animador compartido (`js/animacion.js`)

Solo cambia clases CSS sobre el dibujo actual: nunca modifica el árbol ni redibuja. Los nodos se buscan por
`data-valor` en cada paso, así que marcar un valor que ya no está dibujado no hace nada (no falla).

```js
import { Animador, CLASES, DURACION_PASO } from "./animacion.js";
const animador = new Animador(svg);

// Lo más simple (recorridos de la Parte B): limpia y resalta los nodos uno por uno.
const termino = await animador.resaltarSecuencia([50, 30, 40]);   // true, o false si se canceló

// Una animación de varios pasos es una "sesión":
const termino = await animador.ejecutar(async (a) => {
  a.limpiar();
  await a.secuencia(camino, { conAristas: true }); // resalta el camino nodo por nodo
  a.marcar(valor, CLASES.encontrado);
  await a.esperar();                                // pausa ajustada a la velocidad
});

animador.cancelar();         // cancela la sesión actual
animador.limpiar();          // quita todos los resaltados
animador.setVelocidad(2);    // de 0.25 a 4 (1 = normal)
animador.ocupado;            // true mientras hay una sesión
```

| Herramienta de la sesión (`a`) | Qué hace |
|---|---|
| `secuencia(valores, { clase, conAristas, ms, seguir })` | Activa cada nodo en orden (`nodo-activo`) y lo deja con `clase` (por defecto `nodo-visitado`). `conAristas` resalta las líneas entre valores consecutivos; `seguir` desplaza el área para mantener visible el nodo |
| `esperar(ms)` | Pausa (por defecto `DURACION_PASO` = 650 ms a velocidad 1) |
| `marcar(valor, ...clases)` / `desmarcar(...)` | Agrega o quita clases a un nodo |
| `marcarArista(padre, hijo)` | Resalta una arista |
| `revelarPorNiveles(ms)` | Muestra el árbol nivel por nivel |
| `moverValor(desde, hacia, ms)` | Una copia del nodo `desde` viaja a la posición de `hacia` |
| `limpiar()` | Quita los resaltados y los elementos temporales |

Garantías:
- **Nunca hay dos animaciones a la vez:** `ejecutar` cancela la sesión anterior y espera a que termine antes de empezar.
- **Cancelación segura:** después de cancelar, cualquier herramienta de esa sesión lanza `AnimacionCancelada` (que `ejecutar` atrapa y convierte en `false`), así una sesión vieja no puede tocar el dibujo.
- **Velocidad:** afecta a las pausas (incluso a la que está en curso) y a las transiciones CSS mediante `--factor-velocidad`.
- **`prefers-reduced-motion`:** el CSS quita escalas, apariciones y desplazamientos; los cambios de color se mantienen.

Clases: `nodo-activo`, `nodo-visitado`, `nodo-encontrado`, `nodo-nuevo`, `nodo-eliminando`, `nodo-desvanecer`,
`nodo-sucesor`, `nodo-reemplazo`, `nodo-oculto`, `arista-camino`, `arista-oculta`.

### Interfaz (`js/ui.js`) e integración de la Parte B

- Solo hay **una operación a la vez**: mientras corre, los botones se desactivan y se puede cancelar con el botón o con **Esc**.
- La entrada se valida completa (`/^-?\d+$/` y rango) **antes** de convertirla a número; un campo vacío nunca se convierte en 0.
- Cada operación anima primero sobre el dibujo actual, luego modifica el árbol en un único punto y redibuja. Si se cancela, se redibuja desde el árbol lógico.
- Al seguir un nodo durante una animación se desplaza **solo el área del árbol**, nunca la página. En celulares, al iniciar una operación la página se coloca en la nota de resultados, con el árbol debajo.
- **Zoom** (barra en la esquina del árbol): alejar, acercar (25 % a 200 %), ajustar el árbol completo al área y volver a 100 % centrando la raíz. Solo cambia el tamaño en pantalla del `<svg>` (`width`/`height`); el `viewBox`, las coordenadas y las animaciones no cambian, y el zoom se conserva al redibujar.

El menú tiene cuatro secciones: **Operaciones**, **Recorridos**, **Consultas** y **Operaciones adicionales**.
Mientras la Parte B no esté integrada, sus secciones muestran solo una nota (sin botones).

La Parte B se integra en `js/main.js` con dos líneas, usando su contrato actual (`OPCIONES` y `ejecutar(id, arbol, texto) → { ok, texto, nodos }`):

```js
import * as ParteB from "./ui-parteB.js";  // el módulo exporta OPCIONES y ejecutar
interfaz.registrarParteB(ParteB);          // agrega sus botones y anima `nodos` con el animador compartido
```

Cada opción va a su sección según su `id` (`anchura`, `preorden`, `inorden`, `postorden` → Recorridos;
`niveles`, `nivelDe` → Consultas; el resto → Operaciones adicionales). Una opción puede indicar su propia
`categoria` (`"recorridos"`, `"consultas"` o `"adicionales"`).

Los botones de la Parte B muestran un nombre corto (por ejemplo «Por niveles», «Preorden», «Nivel de nodo», «Suma»)
y conservan el nombre completo de `OPCIONES` como descripción emergente. Una opción puede traer su propio `nombreCorto`.

### Contrato visual (dibujo y animación)

- Cada nodo dibujado es `<g class="nodo" data-valor="X" data-nivel="N">` con `<circle class="disco">` (el nodo, posicionado con `cx`/`cy`; siempre es el primer círculo), `<circle class="anillo">` (doble línea decorativa) y un `<text>`. La raíz lleva además la clase `nodo-raiz`.
- Cada arista es una curva suave, como una rama: `<path class="arista" data-padre="P" data-hijo="H" d="M x1 y1 C … x2 y2">`, que empieza en el centro del padre y termina en el del hijo.
- El `<g class="nodo">` no usa el atributo `transform` y contiene solo el círculo y su valor (la etiqueta "raíz" va aparte, en `<g class="etiquetas">`). Con `transform-box: fill-box` y `transform-origin: center`, cualquier `scale()` se aplica alrededor del centro del nodo.
- Clases CSS de animación: `nodo-activo`, `nodo-visitado` (Parte B); `nodo-encontrado`, `nodo-nuevo`, `nodo-eliminando` (Parte A).
- Opciones del menú: `ejecutar(id, arbol, valor) → { ok, texto, nodos }`.

## Ramas

```
main      ← solo entregas estables
develop   ← integración; todo entra por Pull Request
 ├─ parte-a
 └─ parte-b
```

Antes de abrir un PR, actualiza tu rama con `git pull --rebase origin develop`. No se hace push directo a `main` ni a `develop`.
