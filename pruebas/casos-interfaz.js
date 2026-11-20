/* =========================================================
   Casos de prueba de la validación de entrada (js/ui.js)
   Sin DOM: se pueden correr en el navegador o en Node.
   ========================================================= */

import { interpretarEntrada } from "../js/ui.js";

export function ejecutarPruebas() {
  const resultados = [];
  let grupo = "";
  const comprobar = (nombre, obtenido, esperado) => {
    const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
    resultados.push({ grupo, nombre, esperado, obtenido, ok });
  };
  const valor = (texto, ilegible) => interpretarEntrada(texto, ilegible).valor;
  const tieneError = (texto, ilegible) => interpretarEntrada(texto, ilegible).error !== null;

  grupo = "Entradas válidas";
  comprobar('"50"', valor("50"), 50);
  comprobar('"  -7  " (con espacios)', valor("  -7  "), -7);
  comprobar('"0"', valor("0"), 0);
  comprobar('"-0" se convierte en 0 (no en -0)', Object.is(valor("-0"), 0), true);
  comprobar('"007"', valor("007"), 7);
  comprobar('"-999" (límite)', valor("-999"), -999);
  comprobar('"999" (límite)', valor("999"), 999);

  grupo = "Entradas rechazadas (sin convertir a número)";
  for (const texto of ["", "   ", "abc", "3.5", "1e2", "0x10", "+5", "5 6", "--5", "1000", "-1000", "99999999999999999999"]) {
    comprobar(`"${texto}" se rechaza`, [valor(texto), tieneError(texto)], [null, true]);
  }
  comprobar("campo vacío NO se convierte en 0", valor(""), null);
  comprobar("null y undefined se rechazan", [valor(null), valor(undefined)], [null, null]);
  comprobar("entrada ilegible del navegador (badInput)", [valor("", true), tieneError("", true)], [null, true]);

  grupo = "Mensajes";
  comprobar("vacío explica que falta el valor", interpretarEntrada("").error.includes("vacío"), true);
  comprobar("decimal explica que no es entero", interpretarEntrada("3.5").error.includes("no es un número entero"), true);
  comprobar("fuera de rango lo dice", interpretarEntrada("1000").error.includes("fuera del rango"), true);

  return resultados;
}
