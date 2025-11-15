// stores/CduStore.js - Gestión de CDUs

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
            versionBADA: 'V1',
            versionMiro: '', // NUEVA PROPIEDAD
            responsables: [],
            observaciones: [],
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
            versionBADA: cdu.versionBADA || 'V1',
            versionMiro: cdu.versionMiro || '', // NUEVA PROPIEDAD
            responsables: Array.isArray(cdu.responsables) 
                ? cdu.responsables.map(r => ({...r}))
                : (cdu.responsable ? [{ nombre: cdu.responsable, rol: 'DEV' }] : []),
            observaciones: [...(cdu.observaciones || [])],
            historial: []
        };
    }

    /**
     * Agrega un CDU a una versión
     */
    addCduToVersion(versionId) {
        const version = this.versionStore.getById(versionId);
        if (!version) return null;
        
        const nuevoCdu = this.createCdu();
        version.cdus.push(nuevoCdu);
        
        return nuevoCdu;
    }

    /**
     * Actualiza un campo de un CDU
     */
    updateCdu(cduId, campo, valor) {
        const result = this.findCdu(cduId);
        if (!result) return false;
        
        const { cdu } = result;
        const valorAnterior = cdu[campo];
        
        if (valorAnterior !== valor) {
            cdu[campo] = valor;
            
            // Determinar tipo para historial
            let tipo = campo;
            if (campo === 'nombreCDU') tipo = 'nombre';
            if (campo === 'descripcionCDU') tipo = 'descripcion';
            
            this.addHistorialEntry(cduId, tipo, valorAnterior, valor, campo);
            return true;
        }
        
        return false;
    }

    /**
     * Elimina un CDU de su versión
     */
    deleteCdu(cduId) {
        for (const version of this.versionStore.getAll()) {
            const index = version.cdus.findIndex(c => c.id === cduId);
            if (index !== -1) {
                version.cdus.splice(index, 1);
                
                // Si la versión queda sin CDUs, eliminarla
                if (version.cdus.length === 0) {
                    this.versionStore.deleteVersion(version.id);
                }
                
                return true;
            }
        }
        return false;
    }

    /**
     * GESTIÓN DE RESPONSABLES
     */
    addResponsable(cduId, nombre = '', rol = {rol}) {
        const result = this.findCdu(cduId);
        if (!result) return false;
        
        const { cdu } = result;
        
        if (!Array.isArray(cdu.responsables)) {
            cdu.responsables = [];
        }
        
        cdu.responsables.push({ nombre, rol });
        
        this.addHistorialEntry(
            cduId, 
            'responsable', 
            null, 
            `Agregado: ${nombre || '(vacío)'} (${rol})`
        );
        
        return true;
    }

    updateResponsable(cduId, index, campo, valor) {
        const result = this.findCdu(cduId);
        if (!result) return false;
        
        const { cdu } = result;
        
        if (!Array.isArray(cdu.responsables) || index >= cdu.responsables.length) {
            return false;
        }
        
        const valorAnterior = cdu.responsables[index][campo];
        
        if (valorAnterior !== valor) {
            cdu.responsables[index][campo] = valor;
            
            if (campo === 'nombre') {
                this.addHistorialEntry(
                    cduId, 
                    'responsable', 
                    `${valorAnterior || '(vacío)'} (${cdu.responsables[index].rol})`, 
                    `${valor || '(vacío)'} (${cdu.responsables[index].rol})`
                );
            } else if (campo === 'rol') {
                this.addHistorialEntry(
                    cduId, 
                    'responsable', 
                    `${cdu.responsables[index].nombre || '(vacío)'} (${valorAnterior})`,
                    `${cdu.responsables[index].nombre || '(vacío)'} (${valor})`
                );
            }
            
            return true;
        }
        
        return false;
    }

    deleteResponsable(cduId, index) {
        const result = this.findCdu(cduId);
        if (!result) return false;
        
        const { cdu } = result;
        
        if (!Array.isArray(cdu.responsables) || index >= cdu.responsables.length) {
            return false;
        }
        
        const responsable = cdu.responsables[index];
        cdu.responsables.splice(index, 1);
        
        this.addHistorialEntry(
            cduId, 
            'responsable', 
            `${responsable.nombre || '(vacío)'} (${responsable.rol})`, 
            'Eliminado'
        );
        
        return true;
    }

    /**
     * GESTIÓN DE OBSERVACIONES
     */
    addObservacion(cduId, texto = '') {
        const result = this.findCdu(cduId);
        if (!result) return false;
        
        const { cdu } = result;
        
        if (!Array.isArray(cdu.observaciones)) {
            cdu.observaciones = [];
        }
        
        cdu.observaciones.push(texto);
        
        this.addHistorialEntry(cduId, 'observacion', null, 'Nueva observación agregada');
        
        return true;
    }

    updateObservacion(cduId, index, texto) {
        const result = this.findCdu(cduId);
        if (!result) return false;
        
        const { cdu } = result;
        
        if (!Array.isArray(cdu.observaciones) || index >= cdu.observaciones.length) {
            return false;
        }
        
        const valorAnterior = cdu.observaciones[index];
        
        if (valorAnterior !== texto) {
            cdu.observaciones[index] = texto;
            return true;
        }
        
        return false;
    }

    deleteObservacion(cduId, index) {
        const result = this.findCdu(cduId);
        if (!result) return false;
        
        const { cdu } = result;
        
        if (!Array.isArray(cdu.observaciones) || index >= cdu.observaciones.length) {
            return false;
        }
        
        cdu.observaciones.splice(index, 1);
        
        this.addHistorialEntry(cduId, 'observacion', null, 'Observación eliminada');
        
        return true;
    }

    /**
     * GESTIÓN DE HISTORIAL
     */
    addHistorialEntry(cduId, tipo, valorAnterior, valorNuevo, campo = '') {
        const result = this.findCdu(cduId);
        if (!result) return false;
        
        const { cdu } = result;
        
        if (!Array.isArray(cdu.historial)) {
            cdu.historial = [];
        }
        
        const entry = {
            timestamp: new Date().toISOString(),
            tipo,
            campo,
            valorAnterior,
            valorNuevo
        };
        
        cdu.historial.push(entry);
        return true;
    }

    /**
     * Sincroniza el nextCduId con los IDs existentes
     */
    syncNextCduId() {
        let maxCduId = 0;
        
        this.versionStore.getAll().forEach(v => {
            v.cdus.forEach(c => {
                if (c.id > maxCduId) maxCduId = c.id;
            });
        });
        
        this.nextCduId = maxCduId + 1;
    }
}