# Visualizador de ABB - Actividad 2 (DSM 4A)

Aplicación web para visualizar un **Árbol Binario de Búsqueda (ABB)**: inserción, búsqueda,
eliminación, recorridos y otras operaciones, con representación gráfica en SVG.

Tecnologías: HTML5, CSS3, JavaScript vanilla con **módulos ES** y **SVG**. Sin frameworks ni dependencias.

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
index.html               A   Página principal (controles provisionales)
css/estilos.css          A   Paleta, estilos del árbol y clases de animación
js/
  nodo.js                A   export class Nodo
  abb.js                 A   export class ABB (+ VALOR_MINIMO, VALOR_MAXIMO, esValorValido)
  abb-parteB.js          B   Métodos de la Parte B sobre ABB.prototype
  arbol-svg.js           A   Cálculo de posiciones y dibujo SVG
  animacion.js           A+B Animador compartido (pendiente)
  ui.js                  A   Interfaz de la Parte A y armado del menú (pendiente)
  ui-parteB.js           B   Opciones de la Parte B para el menú
  main.js                A   Punto de entrada
pruebas/
  casos-parteA.js        A   Casos de prueba de la clase ABB (sin DOM)
  prueba-parteA.html     A   Muestra los resultados de casos-parteA.js
  casos-grafica.js       A   Escenarios y pruebas del cálculo de posiciones (sin DOM)
  prueba-grafica.html    A   Dibuja los escenarios y prueba el SVG generado
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
  minimo()            // → number | null (null si está vacío)
  maximo()            // → number | null
}
```

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

### Contrato visual (dibujo y animación)

- Cada nodo dibujado es `<g class="nodo" data-valor="X" data-nivel="N">` con un `<circle>` (posicionado con `cx`/`cy`) y un `<text>`. La raíz lleva además la clase `nodo-raiz`.
- Cada arista es `<line class="arista" data-padre="P" data-hijo="H">`.
- El `<g class="nodo">` no usa el atributo `transform`, así las animaciones pueden usar `transform: scale()` en CSS.
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
