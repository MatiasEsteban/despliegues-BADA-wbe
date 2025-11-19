// src/core/dataStore.js (Modificado)

import { VersionStore } from './stores/VersionStore.js';
import { CduStore } from './stores/CduStore.js';
import { ChangeTracker } from './stores/ChangeTracker.js';
import { StatsCalculator } from './stores/StatsCalculator.js';
import { NotificationSystem } from '../utils/notifications.js';

// --- NUEVOS IMPORTS DE FIREBASE ---
import { db, auth } from './firebaseConfig.js'; // <-- AÑADIDO 'auth'
import { doc, setDoc, onSnapshot, collection, addDoc, serverTimestamp } from "firebase/firestore"; // <-- AÑADIDO 'collection', 'addDoc', 'serverTimestamp'
import { Debouncer } from '../utils/debouncer.js';
// ----------------------------------

// --- CONFIGURACIÓN DE FIREBASE ---
const remoteStateDoc = doc(db, "appState", "mainDoc");
const activityLogCollection = collection(db, "activityLog"); // <-- NUEVA COLECCIÓN

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
        await setDoc(remoteStateDoc, state); 
        console.log("💾 Estado guardado en Firebase.");
    } catch (error) {
        console.error("Error al guardar en Firebase:", error);
        NotificationSystem.error("Error al guardar el estado.");
    }
}

const debouncedSave = Debouncer.debounce(_saveStateToFirebase, 1500);

/**
 * Guarda el registro de actividad en Firestore.
 * @param {Array} changes - Array de cambios para registrar.
 */
async function _logActivityToFirebase(changes) {
    console.log(`📝 Registrando ${changes.length} actividades en Firebase...`);
    try {
        const writePromises = [];
        for (const change of changes) {
            // Añade un timestamp del servidor para un ordenamiento fiable
            const logEntry = {
                ...change,
                timestamp: serverTimestamp() 
            };
            writePromises.push(addDoc(activityLogCollection, logEntry));
        }
        await Promise.all(writePromises);
        console.log("✅ Actividad registrada correctamente.");
    } catch (error) {
        console.error("Error al registrar actividad en Firebase:", error);
        // No notificamos al usuario para no ser intrusivos, solo logueamos.
    }
}


export class DataStore {
    constructor() {
        this.versionStore = new VersionStore();
        this.cduStore = new CduStore(this.versionStore);
        this.changeTracker = new ChangeTracker(this.versionStore);
        this.statsCalculator = new StatsCalculator(this.versionStore);
        this.observers = []; // Observers de UI
        this.isReceivingRemoteUpdate = false; 
    }

    // =============== SISTEMA DE OBSERVACIÓN Y GUARDADO ===============

    subscribe(callback) {
        if (typeof callback === 'function') {
            this.observers.push(callback);
        } else {
             console.error("Intento de suscribir un observer no válido:", callback);
        }
    }

    subscribeToChanges(callback) {
        this.changeTracker.subscribe(callback);
    }

    notify(options = {}) {
        const { fullRender = false, skipSave = false } = options;
        console.log(`🔔 Notificando observers... fullRender: ${fullRender}, skipSave: ${skipSave}`);

        if (this.isReceivingRemoteUpdate) {
            console.log("📡 Actualización remota en progreso, actualizando UI localmente.");
            this.observers.forEach(callback => {
                if (typeof callback === 'function') {
                    try { callback(this.versionStore.getAll(), { fullRender }); }
                    catch (error) { console.error("Error en observer:", error); }
                }
            });
            return; 
        }

        this.observers.forEach(callback => {
             if (typeof callback === 'function') {
                 try { callback(this.versionStore.getAll(), { fullRender }); }
                 catch (error) { console.error("Error en observer:", error); }
             }
        });

        if (!skipSave && !this.hasPendingChanges()) {
            try {
                debouncedSave(this);
            } catch (error) {
                 console.error("Error al llamar a debouncedSave:", error);
                 NotificationSystem.error("Error al intentar guardar.");
            }
        } else if (skipSave) { console.log("💾 Guardado saltado (skipSave=true)."); }
          else { console.log("💾 Guardado saltado (cambios pendientes)."); }
    }

    // =============== CARGA DE DATOS ===============
    
    subscribeToRemoteChanges() {
        const closeLoading = NotificationSystem.loading('Conectando al servidor...');
        
        onSnapshot(remoteStateDoc, (doc) => {
            closeLoading(); 
            
            if (doc.exists()) {
                const savedState = doc.data();
                console.log("📡 Datos recibidos de Firebase, actualizando estado local...");
                
                this.isReceivingRemoteUpdate = true;
                
                if (savedState && Array.isArray(savedState.versiones)) {
                    this.replaceAll(savedState.versiones, savedState.versionEnProduccionId);
                    NotificationSystem.success('Datos sincronizados.', 1500);
                }
                
                setTimeout(() => { 
                    this.isReceivingRemoteUpdate = false; 
                    console.log("📡 Flag de actualización remota desactivado.");
                }, 100);

            } else {
                NotificationSystem.info('No se encontró estado remoto. Creando uno nuevo.');
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
        this.notify({ fullRender: true }); 
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
            this.addPendingChange({ // <-- Llamada al método modificado
                cduId: nuevoCdu.id, campo: 'creacion', valorAnterior: null, valorNuevo: 'CDU creado',
                cduNombre: 'Nuevo CDU', versionId: versionId, versionNumero: version.numero,
                tipo: 'creacion'
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

        this.addPendingChange({ // <-- Llamada al método modificado
            cduId: cduId, campo: 'cdu-eliminado', valorAnterior: `CDU: ${cdu.nombreCDU || 'Sin nombre'}`,
            valorNuevo: null, cduNombre: cdu.nombreCDU || 'Sin nombre', versionId: version.id,
            versionNumero: version.numero, tipo: 'eliminacion'
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

    // =============== GESTIÓN DE CAMBIOS PENDIENTES (MODIFICADO) ===============
    
    /**
     * Añade un cambio pendiente e inyecta la info del usuario.
     */
    addPendingChange(change) {
        // *** INICIO DE LA MODIFICACIÓN ***
        const user = auth.currentUser;
        const userInfo = user 
            ? { userEmail: user.email, userId: user.uid } 
            : { userEmail: 'Usuario Desconocido', userId: null };

        const changeWithUser = {
            ...change,
            ...userInfo,
            // Usar un timestamp local para el *seguimiento* del cambio
            // El timestamp del servidor se añadirá al guardar en el log
            localTimestamp: new Date().toISOString() 
        };
        // *** FIN DE LA MODIFICACIÓN ***

        this.changeTracker.addPendingChange(changeWithUser); // Añade el cambio enriquecido
        this.notify({ skipSave: true });
    }

    /**
     * Aplica los cambios y los registra en el log de actividad.
     */
    applyPendingChanges() {
        const appliedChanges = this.changeTracker.applyPendingChanges();
        
        // *** INICIO DE LA MODIFICACIÓN ***
        // No solo notifica, sino que también guarda en el log de actividad
        if (appliedChanges.length > 0) {
            _logActivityToFirebase(appliedChanges); // Guardar en la colección "activityLog"
        }
        // *** FIN DE LA MODIFICACIÓN ***

        this.notify({ fullRender: true }); // Esto disparará el guardado del *estado principal*
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
    replaceAll(nuevasVersiones, versionEnProduccionIdImportado = null) {
        console.log('🔄 DIAGNÓSTICO - dataStore.replaceAll llamado');
        this.changeTracker.reset();
        this.versionStore.replaceAll(nuevasVersiones, versionEnProduccionIdImportado);
        this.cduStore.syncNextCduId();
        this.notify({ fullRender: true }); 
        console.log('✅ DIAGNÓSTICO - replaceAll completado.');
    }

    // =============== ESTADÍSTICAS (Sin cambios) ===============
    getUniqueStats() { return this.statsCalculator.getUniqueStats(); }
    getStats() { return this.statsCalculator.getGlobalStats(); }
    getVersionStats(versionId) { return this.statsCalculator.getVersionStats(versionId); }
    getAggregatedStats() { return this.statsCalculator.getAggregatedStats(); }

} // Fin clase DataStore