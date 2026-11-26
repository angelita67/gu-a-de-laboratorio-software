// js/app.js
import { abrirBaseDeDatos } from "./db.js";
import {
  autenticarPorDocumento,
  obtenerDocumentoSesion,
  cerrarSesion,
} from "./auth.js";
import {
  validarCantidadNotas,
  evaluarNotas,
  guardarCalculo,
  obtenerHistorialPorDocumento,
} from "./calculator.js";

const dom = {
  vistaAcceso: document.getElementById("vista-acceso"),
  vistaPanel: document.getElementById("vista-panel"),
  formAcceso: document.getElementById("form-acceso"),
  inputDocumento: document.getElementById("input-documento"),
  mensajeAcceso: document.getElementById("mensaje-acceso"),
  usuarioActualDoc: document.getElementById("usuario-actual-doc"),
  btnCerrarSesion: document.getElementById("btn-cerrar-sesion"),
  inputCantidadNotas: document.getElementById("input-cantidad-notas"),
  btnGenerarCampos: document.getElementById("btn-generar-campos"),
  mensajeConfig: document.getElementById("mensaje-config"),
  seccionNotas: document.getElementById("seccion-notas"),
  indicadorPorcentaje: document.getElementById("indicador-porcentaje"),
  formCalculo: document.getElementById("form-calculo"),
  contenedorNotas: document.getElementById("contenedor-notas"),
  mensajeCalculo: document.getElementById("mensaje-calculo"),
  seccionResultado: document.getElementById("seccion-resultado"),
  valorNotaDefinitiva: document.getElementById("valor-nota-definitiva"),
  estadoAcademico: document.getElementById("estado-academico"),
  listaHistorial: document.getElementById("lista-historial"),
};

let documentoActual = null;

function mostrarAlerta(el, texto) {
  el.textContent = texto;
  el.hidden = false;
}

function ocultarAlerta(el) {
  el.textContent = "";
  el.hidden = true;
}

function limpiarErroresInputs() {
  dom.contenedorNotas
    .querySelectorAll("input.input-error")
    .forEach((input) => input.classList.remove("input-error"));
}

function mostrarVistaPanel(documento) {
  documentoActual = documento;
  dom.usuarioActualDoc.textContent = documento;
  dom.vistaAcceso.hidden = true;
  dom.vistaPanel.hidden = false;
  ocultarAlerta(dom.mensajeAcceso);
}

function mostrarVistaAcceso() {
  documentoActual = null;
  dom.vistaPanel.hidden = true;
  dom.vistaAcceso.hidden = false;
  dom.inputDocumento.value = "";
  dom.contenedorNotas.innerHTML = "";
  dom.seccionNotas.hidden = true;
  dom.seccionResultado.hidden = true;
}

function actualizarIndicadorPorcentaje() {
  const inputsPorc = dom.contenedorNotas.querySelectorAll(".input-porcentaje");
  let suma = 0;

  inputsPorc.forEach((input) => {
    const val = parseFloat(input.value);
    if (!Number.isNaN(val) && Number.isFinite(val)) {
      suma += val;
    }
  });

  const redondeada = Number(suma.toFixed(2));
  dom.indicadorPorcentaje.textContent = `Total porcentaje: ${redondeada}%`;
  dom.indicadorPorcentaje.classList.remove("ok", "warn");

  if (Math.abs(100 - suma) <= 0.001) {
    dom.indicadorPorcentaje.classList.add("ok");
  } else {
    dom.indicadorPorcentaje.classList.add("warn");
  }
}

function generarFilasNotas(cantidad) {
  dom.contenedorNotas.innerHTML = "";
  ocultarAlerta(dom.mensajeCalculo);
  dom.seccionResultado.hidden = true;

  for (let i = 0; i < cantidad; i++) {
    const fila = document.createElement("div");
    fila.className = "nota-fila";
    fila.dataset.index = String(i);

    fila.innerHTML = `
      <strong>Nota ${i + 1}</strong>
      <div class="form-group" style="margin-bottom: 0;">
        <label for="nota-valor-${i}">Valor (0.0 - 5.0)</label>
        <input
          type="number"
          id="nota-valor-${i}"
          class="input-valor"
          step="0.01"
          min="0"
          max="5"
          placeholder="Ej: 4.0"
        />
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label for="nota-porc-${i}">Porcentaje (%)</label>
        <input
          type="number"
          id="nota-porc-${i}"
          class="input-porcentaje"
          step="0.01"
          min="0"
          max="100"
          placeholder="Ej: 30"
        />
      </div>
    `;

    dom.contenedorNotas.appendChild(fila);
  }

  dom.contenedorNotas
    .querySelectorAll(".input-porcentaje")
    .forEach((input) => input.addEventListener("input", actualizarIndicadorPorcentaje));

  dom.contenedorNotas
    .querySelectorAll("input")
    .forEach((input) =>
      input.addEventListener("input", () => {
        input.classList.remove("input-error");
        ocultarAlerta(dom.mensajeCalculo);
      })
    );

  dom.seccionNotas.hidden = false;
  actualizarIndicadorPorcentaje();
}

function renderizarResultado(calculo) {
  dom.valorNotaDefinitiva.textContent = calculo.notaDefinitiva.toFixed(2);
  dom.estadoAcademico.textContent = calculo.estado;
  dom.estadoAcademico.classList.remove("aprobado", "reprobado");
  dom.estadoAcademico.classList.add(
    calculo.estado === "Aprobado" ? "aprobado" : "reprobado"
  );
  dom.seccionResultado.hidden = false;
}

async function renderizarHistorial(documento) {
  const registros = await obtenerHistorialPorDocumento(documento);
  dom.listaHistorial.innerHTML = "";

  if (!registros.length) {
    dom.listaHistorial.innerHTML =
      '<p class="texto-vacio">Aún no tienes cálculos registrados.</p>';
    return;
  }

  registros.forEach((reg) => {
    const item = document.createElement("div");
    item.className = "historial-item";
    const fecha = new Date(reg.fechaRegistro).toLocaleString("es-CO");
    const claseEstado = reg.estado === "Aprobado" ? "aprobado" : "reprobado";

    item.innerHTML = `
      <div>
        <strong>${Number(reg.notaDefinitiva).toFixed(2)}</strong>
        <span class="texto-vacio" style="margin-left: 0.5rem;">(${reg.notas.length} notas · ${fecha})</span>
      </div>
      <span class="estado-badge ${claseEstado}">${reg.estado}</span>
    `;
    dom.listaHistorial.appendChild(item);
  });
}

// Eventos
dom.formAcceso.addEventListener("submit", async (e) => {
  e.preventDefault();
  ocultarAlerta(dom.mensajeAcceso);

  try {
    const usuario = await autenticarPorDocumento(dom.inputDocumento.value);
    mostrarVistaPanel(usuario.documento);
    await renderizarHistorial(usuario.documento);
  } catch (err) {
    mostrarAlerta(dom.mensajeAcceso, err.message);
  }
});

dom.btnCerrarSesion.addEventListener("click", () => {
  cerrarSesion();
  mostrarVistaAcceso();
});

dom.btnGenerarCampos.addEventListener("click", () => {
  ocultarAlerta(dom.mensajeConfig);
  const validacion = validarCantidadNotas(dom.inputCantidadNotas.value);

  if (!validacion.ok) {
    mostrarAlerta(dom.mensajeConfig, validacion.mensaje);
    return;
  }

  generarFilasNotas(validacion.cantidad);
});

dom.formCalculo.addEventListener("submit", async (e) => {
  e.preventDefault();
  ocultarAlerta(dom.mensajeCalculo);
  limpiarErroresInputs();

  const filas = [...dom.contenedorNotas.querySelectorAll(".nota-fila")];
  const items = filas.map((fila) => ({
    valor: fila.querySelector(".input-valor").value.trim(),
    porcentaje: fila.querySelector(".input-porcentaje").value.trim(),
  }));

  const resultado = evaluarNotas(items);

  if (!resultado.ok) {
    if (typeof resultado.indice === "number") {
      const fila = filas[resultado.indice];
      if (fila) {
        const selector =
          resultado.campo === "porcentaje" ? ".input-porcentaje" : ".input-valor";
        fila.querySelector(selector)?.classList.add("input-error");
      }
    }
    mostrarAlerta(dom.mensajeCalculo, resultado.mensaje);
    return;
  }

  renderizarResultado(resultado);

  if (documentoActual) {
    await guardarCalculo(documentoActual, resultado);
    await renderizarHistorial(documentoActual);
  }
});

// Inicialización y persistencia tras recarga
(async function init() {
  try {
    await abrirBaseDeDatos();
    const docGuardado = obtenerDocumentoSesion();
    if (docGuardado) {
      const usuario = await autenticarPorDocumento(docGuardado);
      mostrarVistaPanel(usuario.documento);
      await renderizarHistorial(usuario.documento);
    }
  } catch (err) {
    mostrarAlerta(
      dom.mensajeAcceso,
      err.message || "No fue posible inicializar el almacenamiento local."
    );
  }
})();