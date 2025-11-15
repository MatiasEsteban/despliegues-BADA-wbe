// handlers/ResponsableHandlers.js - Manejadores de responsables

import { DOMBuilder } from '../../components/domBuilder.js';
import { Modal } from '../../modals/Modal.js';

export class ResponsableHandlers {
    constructor(dataStore, renderer) {
        this.dataStore = dataStore;
        this.renderer = renderer;
    }

    /**
     * Maneja el blur en el nombre del responsable
     */
    handleResponsableNombreBlur(target, valor) {
        const cduId = parseInt(target.dataset.cduId);
        const respIndex = parseInt(target.dataset.respIndex);
        
        let cduNombre = '';
        let versionNumero = '';
        let valorAnterior = '';
        
        // Buscar el CDU
        for (const version of this.dataStore.getAll()) {
            const cdu = version.cdus.find(c => c.id === cduId);
            if (cdu) {
                cduNombre = cdu.nombreCDU || 'Sin nombre';
                versionNumero = version.numero;
                if (cdu.responsables[respIndex]) {
                    valorAnterior = cdu.responsables[respIndex].nombre || '';
                }
                break;
            }
        }
        
        // Registrar cambio si hay diferencia
        if (valorAnterior !== valor) {
            this.dataStore.addPendingChange({
                cduId,
                campo: 'responsable-nombre',
                index: respIndex,
                valorAnterior,
                valorNuevo: valor,
                cduNombre,
                versionNumero,
                timestamp: new Date().toISOString(),
                tipo: 'responsable'
            });
        }
        
        // Actualizar en dataStore
        this.dataStore.updateResponsable(cduId, respIndex, 'nombre', valor);
    }

    /**
     * Maneja el cambio de rol del responsable
     */
    handleRolChange(target) {
        const cduId = parseInt(target.dataset.cduId);
        const respIndex = parseInt(target.dataset.respIndex);
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
                if (cdu.responsables[respIndex]) {
                    valorAnterior = cdu.responsables[respIndex].rol || 'DEV';
                }
                break;
            }
        }
        
        // Registrar cambio si hay diferencia
        if (valorAnterior !== valor) {
            this.dataStore.addPendingChange({
                cduId,
                campo: 'responsable-rol',
                index: respIndex,
                valorAnterior,
                valorNuevo: valor,
                cduNombre,
                versionNumero,
                timestamp: new Date().toISOString(),
                tipo: 'responsable'
            });
        }
        
        // Actualizar visualmente el display del rol
        const container = target.closest('.rol-select-container');
        if (container) {
            const display = container.querySelector('.rol-display');
            display.innerHTML = `${DOMBuilder.getRolIcon(valor)}<span>${valor}</span>`;
        }
        
        // Actualizar en dataStore
        this.dataStore.updateResponsable(cduId, respIndex, 'rol', valor);
    }

    /**
     * Agrega un nuevo responsable
     */
    handleAddResponsable(btn) {
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
        const container = document.querySelector(`[data-cdu-id="${cduId}"].responsables-container`);
        if (container) {
            // Remover mensaje "vacío" si existe
            const emptyMsg = container.querySelector('.responsables-empty');
            if (emptyMsg) emptyMsg.remove();
            
            // Calcular nuevo índice
            const existingItems = container.querySelectorAll('.responsable-item');
            const newIndex = existingItems.length;
            
            // Crear nuevo item inmediatamente
            const newItem = this.createResponsableItemQuick(cduId, '', 'DEV', newIndex);
            
            // Insertar ANTES del botón "+"
            const btnAdd = container.querySelector('.btn-add');
            container.insertBefore(newItem, btnAdd);
            
            // Focus inmediato en el input
            const input = newItem.querySelector('input[data-campo="responsable-nombre"]');
            if (input) {
                setTimeout(() => input.focus(), 50);
            }
        }
        
        // 2. Actualizar dataStore en segundo plano
        this.dataStore.addPendingChange({
            cduId,
            campo: 'responsable-agregado',
            valorAnterior: null,
            valorNuevo: 'Se agregó un nuevo responsable', // MENSAJE CORREGIDO
            cduNombre,
            versionNumero,
            timestamp: new Date().toISOString(),
            tipo: 'responsable'
        });
        
        this.dataStore.addResponsable(cduId, '', 'DEV');
    }

    /**
     * Elimina un responsable
     */
    async handleRemoveResponsable(btn) {
        const cduId = parseInt(btn.dataset.cduId);
        const respIndex = parseInt(btn.dataset.respIndex);
        
        let cduNombre = '';
        let versionNumero = '';
        let respNombre = '';
        
        // Buscar el CDU
        for (const version of this.dataStore.getAll()) {
            const cdu = version.cdus.find(c => c.id === cduId);
            if (cdu && cdu.responsables[respIndex]) {
                cduNombre = cdu.nombreCDU || 'Sin nombre';
                versionNumero = version.numero;
                respNombre = `${cdu.responsables[respIndex].nombre || 'Sin nombre'} (${cdu.responsables[respIndex].rol})`;
                break;
            }
        }
        
        // Confirmar con el usuario
        const confirmacion = await Modal.confirm(
            '¿Eliminar este responsable?',
            'Confirmar'
        );
        
        if (confirmacion) {
            // 1. ELIMINAR DEL DOM INMEDIATAMENTE (optimista)
            const container = document.querySelector(`[data-cdu-id="${cduId}"].responsables-container`);
            if (container) {
                const item = container.querySelector(`[data-index="${respIndex}"]`);
                if (item) {
                    item.remove();
                    
                    // Si no quedan más responsables, mostrar mensaje vacío
                    const remainingItems = container.querySelectorAll('.responsable-item');
                    if (remainingItems.length === 0) {
                        const empty = document.createElement('div');
                        empty.className = 'responsables-empty';
                        empty.textContent = 'Sin responsables';
                        const btnAdd = container.querySelector('.btn-add');
                        container.insertBefore(empty, btnAdd);
                    }
                }
            }
            
            // 2. Actualizar dataStore en segundo plano
            this.dataStore.addPendingChange({
                cduId,
                campo: 'responsable-eliminado',
                index: respIndex,
                valorAnterior: respNombre,
                valorNuevo: null,
                cduNombre,
                versionNumero,
                timestamp: new Date().toISOString(),
                tipo: 'responsable'
            });
            
            this.dataStore.deleteResponsable(cduId, respIndex);
        }
    }

    /**
     * Crea un item de responsable rápidamente (para render inmediato)
     */
    createResponsableItemQuick(cduId, nombre, rol, index) {
        const item = document.createElement('div');
        item.className = 'responsable-item';
        item.dataset.index = index;
        
        const rolIcon = window.DOMBuilder.getRolIcon(rol);
        
        item.innerHTML = `
            <div class="rol-select-container">
                <div class="rol-display">
                    ${rolIcon}<span>${rol}</span>
                </div>
                <select class="responsable-rol-select" data-cdu-id="${cduId}" data-resp-index="${index}" data-campo="responsable-rol">
                    <option value="DEV" ${rol === 'DEV' ? 'selected' : ''}>DEV</option>
                    <option value="AF" ${rol === 'AF' ? 'selected' : ''}>AF</option>
                    <option value="UX" ${rol === 'UX' ? 'selected' : ''}>UX</option>
                    <option value="AN" ${rol === 'AN' ? 'selected' : ''}>AN</option>
                    <option value="QA" ${rol === 'QA' ? 'selected' : ''}>QA</option>
                </select>
            </div>
            <input type="text" value="${nombre}" placeholder="Nombre..." data-cdu-id="${cduId}" data-resp-index="${index}" data-campo="responsable-nombre">
            <button class="btn-responsable btn-remove" type="button" title="Eliminar responsable" data-cdu-id="${cduId}" data-resp-index="${index}" data-action="remove-responsable">×</button>
        `;
        
        return item;
    }
}