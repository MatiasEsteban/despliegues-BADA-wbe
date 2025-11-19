// src/core/stores/CduStore.js

import { v4 as uuidv4 } from 'uuid';

export class CduStore {
    constructor(versionStore) {
        this.versionStore = versionStore;
        this.nextCduId = 3;
    }

    /**
     * Busca un CDU en todas las versiones
     */
    findCdu(cduId) {
        for (const version of this.versionStore.getAll()) {
            const cdu = version.cdus.find(c => c.id === cduId);
            if (cdu) {
                return { cdu, version };
            }
        }
        return null;
    }

    /**
     * Crea un nuevo CDU con valores por defecto
     */
    createCdu() {
        const nuevoCdu = {
            id: this.nextCduId++,
            uuid: uuidv4(),
            nombreCDU: '',
            descripcionCDU: '',
            estado: 'En Desarrollo',
            versionMiro: '',
            responsables: [],
            observaciones: [],
            pasos: [], 
            isPasosExpanded: false, // NUEVO: Control de estado visual
            historial: [{
                timestamp: new Date().toISOString(),
                tipo: 'creacion',
                campo: '',
                valorAnterior: null,
                valorNuevo: 'CDU Creado'
            }]
        };
        
        return nuevoCdu;
    }

    duplicateCdu(cdu) {
        return {
            id: this.nextCduId++,
            uuid: cdu.uuid,
            nombreCDU: cdu.nombreCDU,
            descripcionCDU: cdu.descripcionCDU,
            estado: cdu.estado,
            versionMiro: cdu.versionMiro || '',
            responsables: Array.isArray(cdu.responsables) 
                ? cdu.responsables.map(r => ({...r}))
                : [],
            observaciones: [...(cdu.observaciones || [])],
            pasos: Array.isArray(cdu.pasos) ? cdu.pasos.map(p => ({...p})) : [],
            isPasosExpanded: cdu.isPasosExpanded || false, // Persistir estado al duplicar
            historial: []
        };
    }

    addCduToVersion(versionId) {
        const version = this.versionStore.getById(versionId);
        if (!version) return null;
        
        const nuevoCdu = this.createCdu();
        version.cdus.push(nuevoCdu);
        
        return nuevoCdu;
    }

    updateCdu(cduId, campo, valor) {
        const result = this.findCdu(cduId);
        if (!result) return false;
        
        const { cdu } = result;
        const valorAnterior = cdu[campo];
        
        if (valorAnterior !== valor) {
            cdu[campo] = valor;
            
            let tipo = campo;
            if (campo === 'nombreCDU') tipo = 'nombre';
            if (campo === 'descripcionCDU') tipo = 'descripcion';
            
            this.addHistorialEntry(cduId, tipo, valorAnterior, valor, campo);
            return true;
        }
        
        return false;
    }

    deleteCdu(cduId) {
        for (const version of this.versionStore.getAll()) {
            const index = version.cdus.findIndex(c => c.id === cduId);
            if (index !== -1) {
                version.cdus.splice(index, 1);
                if (version.cdus.length === 0) {
                    this.versionStore.deleteVersion(version.id);
                }
                return true;
            }
        }
        return false;
    }

    // --- GESTIÓN DE PASOS ---

    addPaso(cduId) {
        const result = this.findCdu(cduId);
        if (!result) return false;
        
        if (!Array.isArray(result.cdu.pasos)) {
            result.cdu.pasos = [];
        }
        
        // Al agregar paso, forzamos la expansión visual
        result.cdu.isPasosExpanded = true; 

        result.cdu.pasos.push({ 
            titulo: '', 
            dificultad: 'Baja', 
            version: 'V1',
            completado: false
        });
        
        return true;
    }

    updatePaso(cduId, index, campo, valor) {
        const result = this.findCdu(cduId);
        if (!result) return false;
        
        if (result.cdu.pasos && result.cdu.pasos[index]) {
            result.cdu.pasos[index][campo] = valor;
            return true;
        }
        return false;
    }

    deletePaso(cduId, index) {
        const result = this.findCdu(cduId);
        if (!result) return false;
        
        if (result.cdu.pasos && result.cdu.pasos[index]) {
            result.cdu.pasos.splice(index, 1);
            return true;
        }
        return false;
    }

    // --- GESTIÓN DE ESTADO VISUAL (NUEVO) ---
    togglePasosExpanded(cduId, isExpanded) {
        const result = this.findCdu(cduId);
        if (result) {
            result.cdu.isPasosExpanded = isExpanded;
            return true;
        }
        return false;
    }

    // --- OTROS HANDLERS ---
    
    addResponsable(cduId, nombre = '', rol = 'DEV') {
        const result = this.findCdu(cduId);
        if (!result) return false;
        if (!Array.isArray(result.cdu.responsables)) result.cdu.responsables = [];
        result.cdu.responsables.push({ nombre, rol });
        this.addHistorialEntry(cduId, 'responsable', null, `Agregado: ${nombre} (${rol})`);
        return true;
    }

    updateResponsable(cduId, index, campo, valor) {
        const result = this.findCdu(cduId);
        if (!result) return false;
        if (result.cdu.responsables && result.cdu.responsables[index]) {
            const anterior = result.cdu.responsables[index][campo];
            if (anterior !== valor) {
                result.cdu.responsables[index][campo] = valor;
                return true;
            }
        }
        return false;
    }

    deleteResponsable(cduId, index) {
        const result = this.findCdu(cduId);
        if (!result) return false;
        if (result.cdu.responsables && result.cdu.responsables[index]) {
            const nombre = result.cdu.responsables[index].nombre;
            result.cdu.responsables.splice(index, 1);
            this.addHistorialEntry(cduId, 'responsable', nombre, 'Eliminado');
            return true;
        }
        return false;
    }

    addObservacion(cduId, texto = '') {
        const result = this.findCdu(cduId);
        if (!result) return false;
        if (!Array.isArray(result.cdu.observaciones)) result.cdu.observaciones = [];
        result.cdu.observaciones.push(texto);
        this.addHistorialEntry(cduId, 'observacion', null, 'Observación agregada');
        return true;
    }

    updateObservacion(cduId, index, texto) {
        const result = this.findCdu(cduId);
        if (!result) return false;
        if (result.cdu.observaciones && result.cdu.observaciones[index]) {
            if (result.cdu.observaciones[index] !== texto) {
                result.cdu.observaciones[index] = texto;
                return true;
            }
        }
        return false;
    }

    deleteObservacion(cduId, index) {
        const result = this.findCdu(cduId);
        if (!result) return false;
        if (result.cdu.observaciones && result.cdu.observaciones[index]) {
            result.cdu.observaciones.splice(index, 1);
            this.addHistorialEntry(cduId, 'observacion', null, 'Observación eliminada');
            return true;
        }
        return false;
    }

    addHistorialEntry(cduId, tipo, valorAnterior, valorNuevo, campo = '') {
        const result = this.findCdu(cduId);
        if (!result) return false;
        if (!Array.isArray(result.cdu.historial)) result.cdu.historial = [];
        result.cdu.historial.push({
            timestamp: new Date().toISOString(),
            tipo, campo, valorAnterior, valorNuevo
        });
        return true;
    }

    syncNextCduId() {
        let maxCduId = 0;
        this.versionStore.getAll().forEach(v => {
            v.cdus.forEach(c => { if (c.id > maxCduId) maxCduId = c.id; });
        });
        this.nextCduId = maxCduId + 1;
    }
}