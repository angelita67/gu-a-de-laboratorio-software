// js/calculator.js
import { STORES, ejecutarOperacion } from "./db.js";

const TOLERANCIA_PORCENTAJE = 0.001;
const NOTA_MINIMA = 0.0;
const NOTA_MAXIMA = 5.0;
const NOTA_APROBACION = 3.0;

/**
 * Valida la cantidad de notas a generar.
 */
export function validarCantidadNotas(cantidadRaw) {
  const cantidad = Number(cantidadRaw);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20) {
    return {
      ok: false,
      mensaje: "Ingresa una cantidad entera de notas entre 1 y 20.",
    };
  }
  return { ok: true, cantidad };
}

/**
 * Valida cada par { valor, porcentaje } y la suma total de porcentajes (100%).
 */
export function evaluarNotas(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      tipo: "VACIO",
      mensaje: "Debes generar y completar al menos una nota.",
    };
  }

  const normalizadas = [];
  let sumaPorcentajes = 0;

  for (let i = 0; i < items.length; i++) {
    const rawNota = items[i].valor;
    const rawPorc = items[i].porcentaje;

    if (rawNota === "" || rawPorc === "" || rawNota === null || rawPorc === null) {
      return {
        ok: false,
        tipo: "CAMPO_VACIO",
        indice: i,
        campo: rawNota === "" ? "valor" : "porcentaje",
        mensaje: `Completa todos los campos numéricos en la nota #${i + 1}.`,
      };
    }

    const valor = Number(rawNota);
    const porcentaje = Number(rawPorc);

    if (!Number.isFinite(valor) || !Number.isFinite(porcentaje)) {
      return {
        ok: false,
        tipo: "NO_NUMERICO",
        indice: i,
        campo: !Number.isFinite(valor) ? "valor" : "porcentaje",
        mensaje: `Ingresa valores numéricos válidos en la nota #${i + 1}.`,
      };
    }

    if (valor < NOTA_MINIMA || valor > NOTA_MAXIMA) {
      return {
        ok: false,
        tipo: "RANGO_NOTA",
        indice: i,
        campo: "valor",
        mensaje: `La nota #${i + 1} (${valor}) está fuera del rango permitido (0.0 a 5.0).`,
      };
    }

    if (porcentaje < 0) {
      return {
        ok: false,
        tipo: "PORCENTAJE_NEGATIVO",
        indice: i,
        campo: "porcentaje",
        mensaje: `El porcentaje de la nota #${i + 1} no puede ser negativo.`,
      };
    }

    sumaPorcentajes += porcentaje;
    normalizadas.push({ valor, porcentaje });
  }

  const diferencia = 100 - sumaPorcentajes;
  if (Math.abs(diferencia) > TOLERANCIA_PORCENTAJE) {
    const detalle =
      diferencia > 0
        ? `Falta ${Number(diferencia.toFixed(2))}% para completar el 100%.`
        : `Sobra ${Number(Math.abs(diferencia).toFixed(2))}% sobre el 100%.`;

    return {
      ok: false,
      tipo: "PORCENTAJE_INVALIDO",
      sumaPorcentajes,
      mensaje: `La suma de porcentajes es ${Number(sumaPorcentajes.toFixed(2))}%. ${detalle}`,
    };
  }

  // Fórmula: Σ (nota_i * porcentaje_i / 100)
  const sumaPonderada = normalizadas.reduce(
    (acc, item) => acc + item.valor * (item.porcentaje / 100),
    0
  );

  const notaDefinitiva = Math.round(sumaPonderada * 100) / 100;
  const estado = notaDefinitiva >= NOTA_APROBACION ? "Aprobado" : "Reprobado";

  return {
    ok: true,
    notas: normalizadas,
    sumaPorcentajes: Number(sumaPorcentajes.toFixed(2)),
    notaDefinitiva,
    estado,
  };
}

/**
 * Guarda un cálculo en el ObjectStore "calculos".
 */
export async function guardarCalculo(documento, calculo) {
  const registro = {
    documento,
    notas: calculo.notas,
    notaDefinitiva: calculo.notaDefinitiva,
    estado: calculo.estado,
    fechaRegistro: new Date().toISOString(),
  };

  return ejecutarOperacion(STORES.CALCULOS, "readwrite", (store) =>
    store.add(registro)
  );
}

/**
 * Obtiene todos los cálculos asociados a un documento usando el índice "por_documento".
 */
export async function obtenerHistorialPorDocumento(documento) {
  const registros = await ejecutarOperacion(
    STORES.CALCULOS,
    "readonly",
    (store) => {
      const index = store.index("por_documento");
      return index.getAll(documento);
    }
  );

  return registros.sort((a, b) => b.id - a.id);
}