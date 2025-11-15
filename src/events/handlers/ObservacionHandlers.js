// handlers/ObservacionHandlers.js - Manejadores de observaciones

import { Modal } from '../../modals/Modal.js';

export class ObservacionHandlers {
    constructor(dataStore, renderer) {
        this.dataStore = dataStore;
        this.renderer = renderer;
    }

    /**
     * Maneja el blur en las observaciones
     */
    handleObservacionBlur(target, valor) {
        const cduId = parseInt(target.dataset.cduId);
        const obsIndex = parseInt(target.dataset.obsIndex);
        
        let cduNombre = '';
        let versionNumero = '';
        let valorAnterior = '';
        
        // Buscar el CDU
        for (const version of this.dataStore.getAll()) {
            const cdu = version.cdus.find(c => c.id === cduId);
            if (cdu) {
                cduNombre = cdu.nombreCDU || 'Sin nombre';
                versionNumero = version.numero;
                valorAnterior = cdu.observaciones[obsIndex] || '';
                break;
            }
        }
        
        // Registrar cambio si hay diferencia
        if (valorAnterior !== valor) {
            this.dataStore.addPendingChange({
                cduId,
                campo: 'observacion',
                index: obsIndex,
                valorAnterior,
                valorNuevo: valor,
                cduNombre,
                versionNumero,
                timestamp: new Date().toISOString(),
                tipo: 'observacion'
            });
        }
        
        // Actualizar en dataStore
        this.dataStore.updateObservacion(cduId, obsIndex, valor);
    }

    /**
     * Agrega una nueva observación
     */
    handleAddObservacion(btn) {
        const cduId = parseInt(btn.dataset.cduId);
        
        let cduNombre = '';
        let versionNumero = '';
        
        // Buscar el CDU
        for (const version of this.dataStore.getAll()) {
            const cdu = version.cdus.find(c => c.id === cduId);
            if (cdu) {
                cduNombre = cdu.nombreCDU || 'Sin nombre';
                versionNumero = version.numero;
                break;
            }
        }
        
        // 1. RENDERIZAR INMEDIATAMENTE (optimista)
        const container = document.querySelector(`[data-cdu-id="${cduId}"].observaciones-container`);
        if (container) {
            // Remover mensaje "vacío" si existe
            const emptyMsg = container.querySelector('.observaciones-empty');
            if (emptyMsg) emptyMsg.remove();
            
            // Calcular nuevo índice
            const existingItems = container.querySelectorAll('.observacion-item');
            const newIndex = existingItems.length;
            
            // Crear nuevo item inmediatamente
            const newItem = this.createObservacionItemQuick(cduId, '', newIndex);
            
            // Insertar ANTES del botón "+"
            const btnAdd = container.querySelector('.btn-add');
            container.insertBefore(newItem, btnAdd);
            
            // Focus inmediato en el input
            const input = newItem.querySelector('input[data-campo="observacion"]');
            if (input) {
                setTimeout(() => input.focus(), 50);
            }
        }
        
        // 2. Actualizar dataStore en segundo plano
        this.dataStore.addPendingChange({
            cduId,
            campo: 'observacion-agregada',
            valorAnterior: null,
            valorNuevo: 'Observación agregada',
            cduNombre,
            versionNumero,
            timestamp: new Date().toISOString(),
            tipo: 'observacion'
        });
        
        this.dataStore.addObservacion(cduId, '');
    }

    /**
     * Elimina una observación
     */
    async handleRemoveObservacion(btn) {
        const cduId = parseInt(btn.dataset.cduId);
        const obsIndex = parseInt(btn.dataset.obsIndex);
        
        let cduNombre = '';
        let versionNumero = '';
        let obsTexto = '';
        
        // Buscar el CDU
        for (const version of this.dataStore.getAll()) {
            const cdu = version.cdus.find(c => c.id === cduId);
            if (cdu && cdu.observaciones[obsIndex]) {
                cduNombre = cdu.nombreCDU || 'Sin nombre';
                versionNumero = version.numero;
                obsTexto = cdu.observaciones[obsIndex] || 'Sin texto';
                break;
            }
        }
        
        // Confirmar con el usuario
        const confirmacion = await Modal.confirm(
            '¿Eliminar esta observación?',
            'Confirmar'
        );
        
        if (confirmacion) {
            // 1. ELIMINAR DEL DOM INMEDIATAMENTE (optimista)
            const container = document.querySelector(`[data-cdu-id="${cduId}"].observaciones-container`);
            if (container) {
                const item = container.querySelector(`[data-index="${obsIndex}"]`);
                if (item) {
                    item.remove();
                    
                    // Si no quedan más observaciones, mostrar mensaje vacío
                    const remainingItems = container.querySelectorAll('.observacion-item');
                    if (remainingItems.length === 0) {
                        const empty = document.createElement('div');
                        empty.className = 'observaciones-empty';
                        empty.textContent = 'Sin observaciones';
                        const btnAdd = container.querySelector('.btn-add');
                        container.insertBefore(empty, btnAdd);
                    }
                }
            }
            
            // 2. Actualizar dataStore en segundo plano
            this.dataStore.addPendingChange({
                cduId,
                campo: 'observacion-eliminada',
                index: obsIndex,
                valorAnterior: obsTexto,
                valorNuevo: null,
                cduNombre,
                versionNumero,
                timestamp: new Date().toISOString(),
                tipo: 'observacion'
            });
            
            this.dataStore.deleteObservacion(cduId, obsIndex);
        }
    }

    /**
     * Crea un item de observación rápidamente (para render inmediato)
     */
    createObservacionItemQuick(cduId, texto, index) {
        const item = document.createElement('div');
        item.className = 'observacion-item';
        item.dataset.index = index;
        
        item.innerHTML = `
            <input type="text" value="${texto}" placeholder="Observación..." data-cdu-id="${cduId}" data-obs-index="${index}" data-campo="observacion">
            <button class="btn-observacion btn-remove" type="button" title="Eliminar observación" data-cdu-id="${cduId}" data-obs-index="${index}" data-action="remove-observacion">×</button>
        `;
        
        return item;
    }
}