// handlers/CduFieldHandlers.js - Manejadores de campos básicos del CDU

import { DOMBuilder } from '../../components/domBuilder.js';

export class CduFieldHandlers {
    constructor(dataStore, renderer) {
        this.dataStore = dataStore;
        this.renderer = renderer;
    }

    /**
     * Maneja el blur en campos de nombre y descripción del CDU
     */
    handleCduFieldBlur(target, campo, valor) {
        const cduId = parseInt(target.dataset.cduId);
        
        let cduNombre = '';
        let versionNumero = '';
        let valorAnterior = '';
        
        // Buscar el CDU en todas las versiones
        for (const version of this.dataStore.getAll()) {
            const cdu = version.cdus.find(c => c.id === cduId);
            if (cdu) {
                cduNombre = campo === 'nombreCDU' ? (cdu.nombreCDU || 'Sin nombre') : cdu.nombreCDU;
                versionNumero = version.numero;
                valorAnterior = cdu[campo] || '';
                break;
            }
        }
        
        // Registrar cambio pendiente si hay diferencia
        if (valorAnterior !== valor) {
            this.dataStore.addPendingChange({
                cduId,
                campo,
                valorAnterior,
                valorNuevo: valor,
                cduNombre: campo === 'nombreCDU' ? valorAnterior : cduNombre,
                versionNumero,
                timestamp: new Date().toISOString(),
                tipo: campo === 'nombreCDU' ? 'nombre' : 'descripcion'
            });
        }
        
        // Actualizar en dataStore
        this.dataStore.updateCdu(cduId, campo, valor);
    }

    /**
     * Maneja el cambio de estado del CDU
     */
    handleEstadoChange(target) {
        const cduId = parseInt(target.dataset.cduId);
        const valorNuevo = target.value;
        
        let valorAnterior = null;
        let cduNombre = '';
        let versionNumero = '';
        
        // Verificar si ya existe un cambio pendiente para este estado
        const existingChange = this.dataStore.getPendingChanges().find(
            c => c.cduId === cduId && c.campo === 'estado'
        );
        
        if (existingChange) {
            valorAnterior = existingChange.valorAnterior;
        }
        
        // Buscar el CDU
        for (const version of this.dataStore.getAll()) {
            const cdu = version.cdus.find(c => c.id === cduId);
            if (cdu) {
                if (!existingChange) {
                    valorAnterior = cdu.estado || 'En Desarrollo';
                }
                cduNombre = cdu.nombreCDU || 'Sin nombre';
                versionNumero = version.numero;
                break;
            }
        }
        
        if (valorAnterior === null || valorAnterior === undefined) {
            valorAnterior = 'En Desarrollo';
        }
        
        // Registrar cambio si hay diferencia
        if (valorAnterior !== valorNuevo) {
            this.dataStore.addPendingChange({
                cduId,
                campo: 'estado',
                valorAnterior,
                valorNuevo,
                cduNombre,
                versionNumero,
                timestamp: new Date().toISOString(),
                tipo: 'estado'
            });
            
            // Actualizar visualmente el display del estado
            const container = target.closest('.estado-select-container');
            if (container) {
                container.classList.remove('estado-desarrollo', 'estado-pendiente', 'estado-certificado', 'estado-produccion');
                container.classList.add(DOMBuilder.getEstadoClass(valorNuevo));
                
                const display = container.querySelector('.estado-display');
                display.innerHTML = `
                    ${DOMBuilder.getEstadoIcon(valorNuevo)}
                    <span>${valorNuevo}</span>
                `;
            }
            
            // Actualizar en dataStore
            this.dataStore.updateCdu(cduId, 'estado', valorNuevo);
        }
    }

    /**
     * Maneja el cambio de Versión BADA
     */
    handleVersionBADAChange(target) {
        const cduId = parseInt(target.dataset.cduId);
        const valor = target.value;
        
        let cduNombre = '';
        let versionNumero = '';
        let valorAnterior = '';
        
        // Buscar el CDU
        for (const version of this.dataStore.getAll()) {
            const cdu = version.cdus.find(c => c.id === cduId);
            if (cdu) {
                cduNombre = cdu.nombreCDU || 'Sin nombre';
                versionNumero = version.numero;
                valorAnterior = cdu.versionBADA || 'V1';
                break;
            }
        }
        
        // Registrar cambio si hay diferencia
        if (valorAnterior !== valor) {
            this.dataStore.addPendingChange({
                cduId,
                campo: 'versionBADA',
                valorAnterior,
                valorNuevo: valor,
                cduNombre,
                versionNumero,
                timestamp: new Date().toISOString(),
                tipo: 'versionBADA'
            });
        }
        
        // Actualizar en dataStore
        this.dataStore.updateCdu(cduId, 'versionBADA', valor);
    }
}