// src/core/stores/VersionStore.js

export class VersionStore {
    constructor() {
        this.versiones = [];
        this.nextVersionId = 1; // Iniciar en 1 si no hay datos cargados
        this.versionEnProduccionId = null;
    }

    /**
     * Obtiene todas las versiones
     */
    getAll() {
        return this.versiones;
    }

    /**
     * Obtiene una versión por ID
     */
    getById(versionId) {
        // Asegurarse de comparar números si los IDs son numéricos
        const idToFind = Number(versionId);
        if (isNaN(idToFind)) return undefined; // Devolver undefined si no es un número válido
        return this.versiones.find(v => Number(v.id) === idToFind);
    }


    /**
     * Obtiene el número de versión más alto
     */
    getLatestVersionNumber() {
        if (this.versiones.length === 0) return 0;

        const numeros = this.versiones
            .map(v => parseInt(v.numero)) // Asume que 'numero' es un string numérico
            .filter(n => !isNaN(n));

        return numeros.length > 0 ? Math.max(...numeros) : 0;
    }

     /**
     * Obtiene el número de versión por ID
     */
     getVersionNumberById(versionId) {
        const version = this.getById(versionId);
        return version ? version.numero : 'Desconocida';
     }

     /** Formatea la hora actual como HH:MM */
     getCurrentTimeFormatted() {
         const now = new Date();
         const hours = now.getHours().toString().padStart(2, '0');
         const minutes = now.getMinutes().toString().padStart(2, '0');
         return `${hours}:${minutes}`;
     }


    /**
     * Agrega una nueva versión vacía
     */
    addEmptyVersion() {
        const latestNumber = this.getLatestVersionNumber();
        const newNumber = String(latestNumber + 1);
        const currentDate = new Date().toISOString().split('T')[0];
        const currentTime = this.getCurrentTimeFormatted(); // Hora actual

        const nuevaVersion = {
            id: this.nextVersionId++, // Asignar ID y luego incrementar
            numero: newNumber,
            fechaCreacion: currentDate,
            horaCreacion: currentTime, // Nuevo campo: Hora actual
            fuente: 'Nueva',
            fechaDespliegue: currentDate, // Fecha despliegue por defecto
            horaDespliegue: '', // Hora despliegue vacía por defecto
            comentarios: this.getDefaultComentarios(),
            cdus: []
        };

        this.versiones.push(nuevaVersion);
        this.syncNextVersionId(); // Asegurar que nextId se actualice después de añadir
        console.log("Nueva versión creada:", nuevaVersion); // Log para depurar
        return nuevaVersion;
    }

    /**
     * Duplica una versión existente con nuevo ID
     */
    duplicateVersion(versionId, cdusCopy) {
        const versionToCopy = this.getById(versionId);
        if (!versionToCopy) {
             console.error(`Error al duplicar: Versión ${versionId} no encontrada.`);
             return null;
        }

        const latestNumber = this.getLatestVersionNumber();
        const newNumber = String(latestNumber + 1);
        const currentDate = new Date().toISOString().split('T')[0];
        const currentTime = this.getCurrentTimeFormatted(); // Hora actual

        const nuevaVersion = {
            id: this.nextVersionId++, // Asignar ID y luego incrementar
            numero: newNumber,
            fechaCreacion: currentDate,
            horaCreacion: currentTime, // Nuevo campo: Hora actual
            fuente: `V${versionToCopy.numero || '?'}`, // Usar fallback si numero no existe
            fechaDespliegue: currentDate, // Fecha despliegue por defecto
            horaDespliegue: '', // Hora despliegue vacía
            // Copia profunda de comentarios, asegurando estructura por defecto si falta
            comentarios: JSON.parse(JSON.stringify(versionToCopy.comentarios || this.getDefaultComentarios())),
            cdus: cdusCopy // Ya vienen copiados del dataStore (con nuevos IDs si es necesario)
        };

        this.versiones.push(nuevaVersion);
        this.syncNextVersionId(); // Asegurar que nextId se actualice después de añadir
        console.log(`Versión ${newNumber} duplicada desde ${versionToCopy.numero}:`, nuevaVersion); // Log para depurar
        return nuevaVersion;
    }

    /**
     * Actualiza un campo de una versión
     */
    updateVersion(versionId, campo, valor) {
        const version = this.getById(versionId);
        if (version) {
            // Comparar antes de asignar para evitar notificaciones innecesarias
            // Tratar '' y null como equivalentes para algunos campos
            const valorActual = version[campo];
            const esDiferente = (valorActual === null && valor !== '') || (valorActual !== null && valorActual !== valor);

            if (esDiferente) {
                 console.log(`Actualizando ${campo} de V${version.numero} (ID ${versionId}): ${valorActual} -> ${valor}`);
                 version[campo] = valor;
                 return true; // Indicar que hubo un cambio
            }
        } else {
             console.error(`updateVersion: Versión ${versionId} no encontrada.`);
        }
        return false; // No se encontró o no hubo cambio
    }


    /**
     * Elimina una versión
     */
    deleteVersion(versionId) {
        // Asegurar comparación numérica
        const idToDelete = Number(versionId);
         if (isNaN(idToDelete)) return false; // Salir si no es número

        const index = this.versiones.findIndex(v => Number(v.id) === idToDelete);

        if (index !== -1) {
            const numeroEliminado = this.versiones[index].numero; // Guardar número para log
            this.versiones.splice(index, 1);
            console.log(`Versión ${numeroEliminado} (ID ${idToDelete}) eliminada.`);
            // Si la versión eliminada era la de producción, limpiar la referencia
            if (Number(this.versionEnProduccionId) === idToDelete) {
                 console.log(`Versión ${numeroEliminado} era la de producción. Desmarcando.`);
                 this.versionEnProduccionId = null;
            }
            return true; // Eliminación exitosa
        }
        console.warn(`deleteVersion: Versión ${versionId} no encontrada para eliminar.`);
        return false; // No se encontró
    }


    /**
     * Reemplaza todas las versiones (usado en importación y carga inicial)
     */
    replaceAll(nuevasVersiones, versionEnProduccionIdImportado = null) {
         // Validar que nuevasVersiones sea un array
         if (!Array.isArray(nuevasVersiones)) {
              console.error("replaceAll recibió datos no válidos:", nuevasVersiones);
              this.versiones = []; // Resetear a vacío como medida de seguridad
              this.versionEnProduccionId = null;
              this.nextVersionId = 1;
              return;
         }
         console.log(`replaceAll: Recibidas ${nuevasVersiones.length} versiones. ID prod importado: ${versionEnProduccionIdImportado}`);


        // Normalizar datos ANTES de asignarlos
        this.versiones = nuevasVersiones.map((v, index) => {
             // Validar estructura básica de 'v'
             if (!v || typeof v !== 'object') {
                  console.warn(`Saltando registro inválido en replaceAll en índice ${index}:`, v);
                  return null; // Marcar para filtrar después
             }
             // --- INICIO DE CORRECCIÓN ---
             // const defaultTime = this.getCurrentTimeFormatted(); // <-- ELIMINADO
             // const defaultDate = new Date().toISOString().split('T')[0]; // <-- ELIMINADO
             // --- FIN DE CORRECCIÓN ---

             return {
                 id: v.id ?? (index + 1), // Usar ID existente o generar uno temporal
                 numero: String(v.numero || `Import ${index + 1}`),
                 
                 // --- INICIO DE CORRECCIÓN ---
                 // El fallback es un string vacío, no la fecha actual.
                 // storageManager (el cambio anterior) ya debería proveer el valor correcto si existía.
                 fechaCreacion: v.fechaCreacion || '',
                 horaCreacion: v.horaCreacion || '', 
                 // --- FIN DE CORRECCIÓN ---

                 fuente: v.fuente || 'Importada',
                 fechaDespliegue: v.fechaDespliegue || '',
                 horaDespliegue: v.horaDespliegue || '',
                 comentarios: (typeof v.comentarios === 'object' && v.comentarios !== null)
                    ? { ...this.getDefaultComentarios(), ...v.comentarios }
                    : this.getDefaultComentarios(),
                 cdus: Array.isArray(v.cdus) ? v.cdus.map(c => {
                      // Validar estructura básica de 'c'
                       if (!c || typeof c !== 'object') {
                            console.warn(`Saltando CDU inválido en versión ${v.numero}:`, c);
                            return null; // Marcar para filtrar
                       }
                       return {
                            ...c,
                            responsables: Array.isArray(c.responsables) ? c.responsables : [],
                            observaciones: Array.isArray(c.observaciones) ? c.observaciones : [],
                            historial: Array.isArray(c.historial) ? c.historial : []
                       };
                 }).filter(Boolean) : [] // Filtrar CDUs nulos
             };
        }).filter(Boolean); // Filtrar versiones nulas

        // Sincronizar IDs después de asignar y normalizar
        this.syncNextVersionId();

        // Establecer versión en producción usando el ID importado (ya es el ID final reasignado si vino de importExcel)
        // Validar que el ID exista en las versiones cargadas
        const idProdFinal = Number(versionEnProduccionIdImportado);
        if (!isNaN(idProdFinal) && this.versiones.some(v => Number(v.id) === idProdFinal)) {
             this.versionEnProduccionId = idProdFinal;
             console.log("Versión en producción establecida desde importación:", this.versionEnProduccionId);
        } else {
             // Si el ID importado no existe o es inválido, buscar si alguna versión tiene 'SÍ' (fallback)
              const versionConSi = this.versiones.find(v => v['En Producción'] === 'SÍ'); // Asumiendo que el importer lo dejó
              if (versionConSi) {
                   this.versionEnProduccionId = versionConSi.id;
                   console.log("Versión en producción establecida por fallback ('SÍ'):", this.versionEnProduccionId);
              } else {
                   this.versionEnProduccionId = null; // Si no, dejar null
                   console.log("No se estableció versión en producción desde importación.");
              }
        }
         console.log(`replaceAll completado. Total versiones: ${this.versiones.length}. ID Prod final: ${this.versionEnProduccionId}. Next ID: ${this.nextVersionId}`);
    }


    /**
     * Marca o desmarca una versión como en producción.
     * @param {number|string|null} versionId El ID de la versión a marcar, o null para desmarcar.
     */
    setVersionEnProduccion(versionId) {
        // Convertir a número o null
        const newProdId = (versionId === null || versionId === undefined || versionId === '') ? null : Number(versionId);

        if (isNaN(newProdId) && newProdId !== null) {
            console.error("setVersionEnProduccion recibió un ID inválido:", versionId);
            return; // No hacer nada si el ID no es válido
        }

        const currentProdId = this.versionEnProduccionId;

        // Si el nuevo ID es el mismo que el actual, desmarcar (poner null)
        if (newProdId !== null && newProdId === currentProdId) {
            this.versionEnProduccionId = null;
            console.log(`Versión ${newProdId} desmarcada de producción.`);
        }
        // Si el nuevo ID es diferente (o null y antes había uno), actualizar
        else if (newProdId !== currentProdId) {
             // Verificar que el ID exista si no es null
             if (newProdId !== null && !this.versiones.some(v => Number(v.id) === newProdId)) {
                  console.error(`setVersionEnProduccion: La versión ${newProdId} no existe.`);
                  return; // No marcar una versión inexistente
             }
            this.versionEnProduccionId = newProdId;
            console.log(`Versión ${newProdId === null ? 'ninguna' : newProdId} marcada como en producción.`);
        }
        // Si newProdId es null y currentProdId ya era null, no hacer nada.
    }

    /**
     * Obtiene el ID de la versión actualmente en producción.
     * @returns {number|null} El ID de la versión en producción, o null si ninguna.
     */
    getVersionEnProduccionId() {
        return this.versionEnProduccionId;
    }

    /**
     * Añade un comentario a una categoría específica de una versión.
     * @param {number|string} versionId ID de la versión.
     * @param {string} categoria Clave de la categoría ('mejoras', 'salidas', etc.).
     * @param {string} texto Texto del comentario.
     * @returns {boolean} True si se añadió, False si no.
     */
    addComentarioCategoria(versionId, categoria, texto = '') {
        const version = this.getById(versionId);
        if (!version || !this.getDefaultComentarios().hasOwnProperty(categoria)) return false;

        // Asegurar que 'comentarios' sea un objeto y la categoría un array
        if (typeof version.comentarios !== 'object' || version.comentarios === null) {
            version.comentarios = this.getDefaultComentarios();
        }
        if (!Array.isArray(version.comentarios[categoria])) {
            version.comentarios[categoria] = [];
        }

        version.comentarios[categoria].push(texto);
        return true;
    }

    /**
     * Actualiza un comentario existente en una categoría.
     * @param {number|string} versionId ID de la versión.
     * @param {string} categoria Clave de la categoría.
     * @param {number} index Índice del comentario a actualizar.
     * @param {string} texto Nuevo texto del comentario.
     * @returns {boolean} True si se actualizó, False si no.
     */
    updateComentarioCategoria(versionId, categoria, index, texto) {
        const version = this.getById(versionId);
        if (!version || typeof version.comentarios !== 'object' || !Array.isArray(version.comentarios[categoria])) return false;

        if (index >= 0 && index < version.comentarios[categoria].length) {
            if (version.comentarios[categoria][index] !== texto) {
                 version.comentarios[categoria][index] = texto;
                 return true; // Hubo cambio
            }
        }
        return false; // No se encontró o no hubo cambio
    }

    /**
     * Elimina un comentario de una categoría por su índice.
     * @param {number|string} versionId ID de la versión.
     * @param {string} categoria Clave de la categoría.
     * @param {number} index Índice del comentario a eliminar.
     * @returns {boolean} True si se eliminó, False si no.
     */
    deleteComentarioCategoria(versionId, categoria, index) {
        const version = this.getById(versionId);
        if (!version || typeof version.comentarios !== 'object' || !Array.isArray(version.comentarios[categoria])) return false;

        if (index >= 0 && index < version.comentarios[categoria].length) {
            version.comentarios[categoria].splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Devuelve la estructura por defecto para los comentarios.
     * @returns {object} Objeto con arrays vacíos para cada categoría.
     */
    getDefaultComentarios() {
        return {
            mejoras: [],
            salidas: [],
            cambiosCaliente: [],
            observaciones: []
        };
    }

    /**
     * Sincroniza el nextVersionId para que sea mayor que el ID más alto existente.
     */
     syncNextVersionId() {
        if (this.versiones.length > 0) {
            const validIds = this.versiones.map(v => Number(v.id)).filter(id => !isNaN(id) && id > 0);
            if (validIds.length > 0) {
                 const maxId = Math.max(...validIds);
                 this.nextVersionId = Math.max(this.nextVersionId, maxId + 1);
            } else {
                 // Si no hay IDs válidos, empezar desde 1 + longitud como fallback
                 this.nextVersionId = Math.max(1, this.versiones.length + 1);
            }
        } else {
             this.nextVersionId = 1; // Si no hay versiones, el próximo ID es 1
        }
         // Asegurar que nextVersionId sea al menos 1
         this.nextVersionId = Math.max(1, this.nextVersionId);
         console.log("SyncNextVersionId -> nextVersionId final:", this.nextVersionId);
    }
}