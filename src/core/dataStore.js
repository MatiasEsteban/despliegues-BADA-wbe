// src/core/dataStore.js (Modificado)

import { VersionStore } from './stores/VersionStore.js';
import { CduStore } from './stores/CduStore.js';
import { ChangeTracker } from './stores/ChangeTracker.js';
import { StatsCalculator } from './stores/StatsCalculator.js';
// import { StorageManager } from './storageManager.js'; // <- REEMPLAZADO
import { NotificationSystem } from '../utils/notifications.js';

// --- NUEVOS IMPORTS DE FIREBASE ---
import { db } from './firebaseConfig.js'; 
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { Debouncer } from '../utils/debouncer.js';
// ----------------------------------

// --- CONFIGURACIÓN DE FIREBASE ---
// Referencia al documento único que guardará todo el estado
// "appState" es la colección, "mainDoc" es el documento.
const remoteStateDoc = doc(db, "appState", "mainDoc");

/**
 * Guarda el estado completo en Firestore.
 * @param {DataStore} dataStore
 */
async function _saveStateToFirebase(dataStore) {
    try {
        const state = {
            versiones: dataStore.getAll(),
            versionEnProduccionId: dataStore.getVersionEnProduccionId(),
            timestamp: new Date().toISOString()
        };
        // setDoc sobrescribe el documento con los nuevos datos
        await setDoc(remoteStateDoc, state); 
        console.log("💾 Estado guardado en Firebase.");
    } catch (error) {
        console.error("Error al guardar en Firebase:", error);
        NotificationSystem.error("Error al guardar el estado.");
    }
}

// Crea una versión "debounced" de la función de guardado.
// Esto agrupa múltiples cambios y guarda solo una vez, 1.5 segundos
// después de la ÚLTIMA modificación.
const debouncedSave = Debouncer.debounce(_saveStateToFirebase, 1500);
// ----------------------------------


export class DataStore {
    constructor() {
        this.versionStore = new VersionStore();
        this.cduStore = new CduStore(this.versionStore);
        this.changeTracker = new ChangeTracker(this.versionStore);
        this.statsCalculator = new StatsCalculator(this.versionStore);
        this.observers = []; // Observers de UI
        
        // --- NUEVO FLAG ---
        // Previene bucles de sincronización.
        // true si el cambio vino de Firebase.
        this.isReceivingRemoteUpdate = false; 
    }

    // =============== SISTEMA DE OBSERVACIÓN Y GUARDADO ===============

    /** Suscribe un callback para notificaciones de cambio de datos */
    subscribe(callback) {
        if (typeof callback === 'function') {
            this.observers.push(callback);
        } else {
             console.error("Intento de suscribir un observer no válido:", callback);
        }
    }

    /** Suscribe un callback para notificaciones de cambios pendientes */
    subscribeToChanges(callback) {
        this.changeTracker.subscribe(callback);
    }

    /** Notifica a los observers de UI y guarda el estado si no hay cambios pendientes */
    notify(options = {}) {
        const { fullRender = false, skipSave = false } = options;
        console.log(`🔔 Notificando observers... fullRender: ${fullRender}, skipSave: ${skipSave}`);

        // Si el flag está activo, significa que los datos
        // vienen de la nube, así que solo actualizamos la UI.
        if (this.isReceivingRemoteUpdate) {
            console.log("📡 Actualización remota en progreso, actualizando UI localmente.");
            this.observers.forEach(callback => {
                if (typeof callback === 'function') {
                    try { callback(this.versionStore.getAll(), { fullRender }); }
                    catch (error) { console.error("Error en observer:", error); }
                }
            });
            return; // No disparamos un guardado de vuelta
        }

        // Si es un cambio local, notificamos a la UI
        // y disparamos el guardado en Firebase.
        this.observers.forEach(callback => {
             if (typeof callback === 'function') {
                 try { callback(this.versionStore.getAll(), { fullRender }); }
                 catch (error) { console.error("Error en observer:", error); }
             }
        });

        // MODIFICADO: Guardar estado en FIREBASE
        if (!skipSave && !this.hasPendingChanges()) {
            try {
                // Usamos la versión debounced
                debouncedSave(this);
            } catch (error) {
                 console.error("Error al llamar a debouncedSave:", error);
                 NotificationSystem.error("Error al intentar guardar.");
            }
        } else if (skipSave) { console.log("💾 Guardado saltado (skipSave=true)."); }
          else { console.log("💾 Guardado saltado (cambios pendientes)."); }
    }

    // =============== ¡NUEVA FUNCIÓN DE CARGA! ===============
    /**
     * Se suscribe a los cambios en tiempo real de Firebase.
     * Reemplaza a `StorageManager.loadState()`.
     */
    subscribeToRemoteChanges() {
        const closeLoading = NotificationSystem.loading('Conectando al servidor...');
        
        onSnapshot(remoteStateDoc, (doc) => {
            closeLoading(); // Cerramos el "Cargando..."
            
            if (doc.exists()) {
                const savedState = doc.data();
                console.log("📡 Datos recibidos de Firebase, actualizando estado local...");
                
                // 1. Poner el flag en true
                this.isReceivingRemoteUpdate = true;
                
                // 2. Cargar los datos en el store
                if (savedState && Array.isArray(savedState.versiones)) {
                    this.replaceAll(savedState.versiones, savedState.versionEnProduccionId);
                    NotificationSystem.success('Datos sincronizados.', 1500);
                }
                
                // 3. Quitar el flag
                // Usamos un timeout corto para asegurar que
                // todos los renders de la UI se completen
                setTimeout(() => { 
                    this.isReceivingRemoteUpdate = false; 
                    console.log("📡 Flag de actualización remota desactivado.");
                }, 100);

            } else {
                // El documento no existe, es la primera vez que alguien se conecta.
                NotificationSystem.info('No se encontró estado remoto. Creando uno nuevo.');
                // Forzamos un guardado del estado inicial (vacío)
                this.notify({ fullRender: true }); 
            }
        }, (error) => {
            console.error("Error al escuchar cambios de Firebase:", error);
            closeLoading();
            NotificationSystem.error("Error de conexión. Trabajando en modo offline.");
        });
    }


    // =============== ACCESO A DATOS (Sin cambios) ===============
    getAll() { return this.versionStore.getAll(); }
    getById(versionId) { return this.versionStore.getById(versionId); }
    getVersionNumberById(versionId) { return this.versionStore.getVersionNumberById(versionId); }
    getPendingChanges() { return this.changeTracker.getPendingChanges(); }
    hasPendingChanges() { return this.changeTracker.hasPendingChanges(); }

    // =============== GESTIÓN DE VERSIONES (Sin cambios) ===============
    getLatestVersionNumber() { return this.versionStore.getLatestVersionNumber(); }
    addNewEmptyVersion() {
        const nuevaVersion = this.versionStore.addEmptyVersion();
        this.notify({ fullRender: true }); // Notificar con render completo y guardar
        return nuevaVersion;
    }
    duplicateVersion(versionId) {
        const versionToCopy = this.versionStore.getById(versionId);
        if (!versionToCopy) return null;
        const cdusOriginales = Array.isArray(versionToCopy.cdus) ? versionToCopy.cdus : [];
        const cdusCopy = cdusOriginales.map(cdu => this.cduStore.duplicateCdu(cdu));
        const nuevaVersion = this.versionStore.duplicateVersion(versionId, cdusCopy);
        this.notify({ fullRender: true });
        return nuevaVersion;
    }
    updateVersion(versionId, campo, valor) {
        const changed = this.versionStore.updateVersion(versionId, campo, valor);
        if (changed) {
            this.notify({ fullRender: false, skipSave: this.hasPendingChanges() });
        }
        return changed;
    }
    deleteVersion(versionId) {
        const deleted = this.versionStore.deleteVersion(versionId);
        if (deleted) {
            this.notify({ fullRender: true });
        }
        return deleted;
    }
    setVersionEnProduccion(versionId) {
        const idAnterior = this.versionStore.getVersionEnProduccionId();
        this.versionStore.setVersionEnProduccion(versionId);
        const idNuevo = this.versionStore.getVersionEnProduccionId();
        if (idAnterior !== idNuevo) {
             this.notify({ fullRender: true, skipSave: true });
        }
    }
    getVersionEnProduccionId() { return this.versionStore.getVersionEnProduccionId(); }
    setVersionEnProduccionTemporal(versionId) {
        const valorAnterior = this.versionStore.getVersionEnProduccionId();
        this.versionStore.setVersionEnProduccion(versionId);
        this.notify({ fullRender: true, skipSave: true });
        return valorAnterior;
    }

    // =============== GESTIÓN DE COMENTARIOS DE VERSIÓN (Sin cambios) ===============
    addComentarioCategoria(versionId, categoria, texto = '') {
        if (this.versionStore.addComentarioCategoria(versionId, categoria, texto)) {
            this.notify({ skipSave: this.hasPendingChanges() });
        }
    }
    updateComentarioCategoria(versionId, categoria, index, texto) {
        if (this.versionStore.updateComentarioCategoria(versionId, categoria, index, texto)) {
            this.notify({ skipSave: this.hasPendingChanges() });
        }
    }
    deleteComentarioCategoria(versionId, categoria, index) {
        if (this.versionStore.deleteComentarioCategoria(versionId, categoria, index)) {
            this.notify({ skipSave: this.hasPendingChanges() });
        }
    }
    getDefaultComentarios() { return this.versionStore.getDefaultComentarios(); }

    // =============== GESTIÓN DE CDUs (Sin cambios) ===============
    addCduToVersion(versionId) {
        const version = this.versionStore.getById(versionId);
        if (!version) return null;
        const nuevoCdu = this.cduStore.addCduToVersion(versionId);
        if (nuevoCdu) {
            this.changeTracker.addPendingChange({
                cduId: nuevoCdu.id, campo: 'creacion', valorAnterior: null, valorNuevo: 'CDU creado',
                cduNombre: 'Nuevo CDU', versionId: versionId, versionNumero: version.numero,
                timestamp: new Date().toISOString(), tipo: 'creacion'
            });
            this.notify({ fullRender: false, skipSave: true });
        }
        return nuevoCdu;
    }
    updateCdu(cduId, campo, valor) {
        const changed = this.cduStore.updateCdu(cduId, campo, valor);
        if (changed) {
            this.notify({ fullRender: false, skipSave: this.hasPendingChanges() });
        }
        return changed;
    }
    deleteCdu(cduId) {
        const { cdu, version } = this.cduStore.findCdu(cduId) || {};
        if (!cdu || !version) return false;

        this.changeTracker.addPendingChange({
            cduId: cduId, campo: 'cdu-eliminado', valorAnterior: `CDU: ${cdu.nombreCDU || 'Sin nombre'}`,
            valorNuevo: null, cduNombre: cdu.nombreCDU || 'Sin nombre', versionId: version.id,
            versionNumero: version.numero, timestamp: new Date().toISOString(), tipo: 'eliminacion'
        });

        const deleted = this.cduStore.deleteCdu(cduId);
        if (deleted) {
            this.notify({ fullRender: false, skipSave: true });
        }
        return deleted;
    }

    // =============== GESTIÓN DE RESPONSABLES (Sin cambios) ===============
    addResponsable(cduId, nombre = '', rol = 'DEV') {
        if (this.cduStore.addResponsable(cduId, nombre, rol)) {
            this.notify({ skipSave: this.hasPendingChanges() });
        }
    }
    updateResponsable(cduId, index, campo, valor) {
        if (this.cduStore.updateResponsable(cduId, index, campo, valor)) {
            this.notify({ skipSave: this.hasPendingChanges() });
        }
    }
    deleteResponsable(cduId, index) {
        if (this.cduStore.deleteResponsable(cduId, index)) {
            this.notify({ skipSave: this.hasPendingChanges() });
        }
    }

    // =============== GESTIÓN DE OBSERVACIONES (Sin cambios) ===============
    addObservacion(cduId, texto = '') {
        if (this.cduStore.addObservacion(cduId, texto)) {
            this.notify({ skipSave: this.hasPendingChanges() });
        }
    }
    updateObservacion(cduId, index, texto) {
        if (this.cduStore.updateObservacion(cduId, index, texto)) {
            this.notify({ skipSave: this.hasPendingChanges() });
        }
    }
    deleteObservacion(cduId, index) {
        if (this.cduStore.deleteObservacion(cduId, index)) {
            this.notify({ skipSave: this.hasPendingChanges() });
        }
    }

    // =============== HISTORIAL (Sin cambios) ===============
    addHistorialEntry(cduId, tipo, valorAnterior, valorNuevo, campo = '') {
        this.cduStore.addHistorialEntry(cduId, tipo, valorAnterior, valorNuevo, campo);
    }

    // =============== GESTIÓN DE CAMBIOS PENDIENTES (Sin cambios) ===============
    // (La lógica existente funciona perfecto con el nuevo `notify`)
    addPendingChange(change) {
        this.changeTracker.addPendingChange(change);
        this.notify({ skipSave: true });
    }
    applyPendingChanges() {
        const appliedChanges = this.changeTracker.applyPendingChanges();
        this.notify({ fullRender: true }); // Esto disparará el guardado en Firebase
        return appliedChanges;
    }
    discardPendingChanges() {
        const restored = this.changeTracker.restoreSnapshot();
        this.changeTracker.reset();
        if (restored) {
             this.notify({ fullRender: true, skipSave: true });
        } else {
             this.notify({ fullRender: true, skipSave: true });
        }
    }

    // =============== IMPORTACIÓN / REEMPLAZO (Sin cambios) ===============
    // (Esta función ahora es llamada por `subscribeToRemoteChanges`)
    replaceAll(nuevasVersiones, versionEnProduccionIdImportado = null) {
        console.log('🔄 DIAGNÓSTICO - dataStore.replaceAll llamado');
        this.changeTracker.reset();
        this.versionStore.replaceAll(nuevasVersiones, versionEnProduccionIdImportado);
        this.cduStore.syncNextCduId();
        // Esta notificación será "atrapada" por el flag `isReceivingRemoteUpdate`
        // y solo actualizará la UI, sin volver a guardar.
        this.notify({ fullRender: true }); 
        console.log('✅ DIAGNÓSTICO - replaceAll completado.');
    }

    // =============== ESTADÍSTICAS (Sin cambios) ===============
    getUniqueStats() { return this.statsCalculator.getUniqueStats(); }
    getStats() { return this.statsCalculator.getGlobalStats(); }
    getVersionStats(versionId) { return this.statsCalculator.getVersionStats(versionId); }
    getAggregatedStats() { return this.statsCalculator.getAggregatedStats(); }

} // Fin clase DataStore