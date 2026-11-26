// js/auth.js
import { STORES, ejecutarOperacion } from "./db.js";

const SESSION_KEY = "documento_activo_notas";

/**
 * Busca un usuario por documento; si no existe, lo crea automáticamente.
 * Actualiza ultimoAcceso y guarda la sesión ligera en sessionStorage.
 */
export async function autenticarPorDocumento(documentoRaw) {
  const documento = String(documentoRaw ?? "").trim();

  if (!documento) {
    throw new Error("Debes ingresar un número de documento válido.");
  }

  const ahora = new Date().toISOString();

  const usuarioExistente = await ejecutarOperacion(
    STORES.USUARIOS,
    "readonly",
    (store) => store.get(documento)
  );

  const usuario = usuarioExistente
    ? { ...usuarioExistente, ultimoAcceso: ahora }
    : { documento, creadoEn: ahora, ultimoAcceso: ahora };

  await ejecutarOperacion(STORES.USUARIOS, "readwrite", (store) =>
    store.put(usuario)
  );

  sessionStorage.setItem(SESSION_KEY, documento);
  return usuario;
}

export function obtenerDocumentoSesion() {
  return sessionStorage.getItem(SESSION_KEY);
}

export function cerrarSesion() {
  sessionStorage.removeItem(SESSION_KEY);
}