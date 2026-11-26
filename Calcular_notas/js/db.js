// js/db.js
// Capa de acceso a IndexedDB para el sistema de cálculo de notas definitivas

const DB_NAME = "NotasDefinitivasDB";
const DB_VERSION = 1;

export const STORES = {
  USUARIOS: "usuarios",
  CALCULOS: "calculos",
};

let dbInstance = null;

/**
 * Abre (o crea y actualiza) la conexión con IndexedDB.
 * Retorna una promesa resuelta con la instancia IDBDatabase.
 */
export function abrirBaseDeDatos() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Se ejecuta si la BD no existe o si DB_VERSION aumenta
    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // ObjectStore de estudiantes: llave primaria "documento"
      if (!db.objectStoreNames.contains(STORES.USUARIOS)) {
        const usuariosStore = db.createObjectStore(STORES.USUARIOS, {
          keyPath: "documento",
        });
        usuariosStore.createIndex("ultimoAcceso", "ultimoAcceso", { unique: false });
      }

      // ObjectStore de historial de cálculos: id autoincremental + índice por documento
      if (!db.objectStoreNames.contains(STORES.CALCULOS)) {
        const calculosStore = db.createObjectStore(STORES.CALCULOS, {
          keyPath: "id",
          autoIncrement: true,
        });
        calculosStore.createIndex("por_documento", "documento", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;

      // Manejo preventivo si otra pestaña solicita actualizar versión
      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
      };

      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(
        new Error(
          `Error al abrir IndexedDB: ${event.target.error?.message || "desconocido"}`
        )
      );
    };

    request.onblocked = () => {
      reject(
        new Error(
          "La base de datos está bloqueada por otra pestaña abierta. Cierra otras pestañas e inténtalo de nuevo."
        )
      );
    };
  });
}

/**
 * Helper genérico para ejecutar operaciones dentro de una transacción.
 */
export async function ejecutarOperacion(storeName, mode, operationFn) {
  const db = await abrirBaseDeDatos();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    let result;
    try {
      result = operationFn(store);
    } catch (error) {
      reject(error);
      return;
    }

    if (result && typeof result.onsuccess !== "undefined") {
      result.onsuccess = () => resolve(result.result);
      result.onerror = () =>
        reject(result.error || new Error("Error en operación de IndexedDB"));
    } else {
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () =>
        reject(transaction.error || new Error("Error en la transacción"));
    }
  });
}