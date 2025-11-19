// handlers/PasoHandlers.js - Manejadores de Pasos

import { Modal } from '../../modals/Modal.js';

export class PasoHandlers {
    constructor(dataStore, renderer) {
        this.dataStore = dataStore;
        this.renderer = renderer;
    }

    handleAddPaso(btn) {
        const cduId = parseInt(btn.dataset.cduId);
        const container = document.querySelector(`[data-cdu-id="${cduId}"].pasos-container`);
        if (container) {
            const content = container.querySelector('.pasos-content');
            const emptyMsg = content.querySelector('.pasos-empty');
            if (emptyMsg) emptyMsg.remove();

            // Si está oculto, mostrarlo
            if (content.classList.contains('hidden')) {
                this.toggleVisibilityInternal(container, true);
                // Guardar estado expandido
                this.dataStore.cduStore.togglePasosExpanded(cduId, true);
            }

            const existingItems = content.querySelectorAll('.paso-item');
            const newIndex = existingItems.length;

            const newItem = this.createPasoItemQuick(cduId, '', 'Baja', 'V1', false, newIndex);
            const btnAdd = content.querySelector('.btn-add');
            content.insertBefore(newItem, btnAdd);

            const input = newItem.querySelector('input[data-campo="paso-titulo"]');
            if (input) setTimeout(() => input.focus(), 50);
            
            this.updateSummary(cduId);

            if (this.renderer.virtualScroll) {
                requestAnimationFrame(() => this.renderer.virtualScroll.checkSizes());
            }
        }

        this.dataStore.cduStore.addPaso(cduId);
        this.dataStore.addPendingChange({
            cduId,
            campo: 'paso-agregado',
            valorAnterior: null,
            valorNuevo: 'Nuevo paso',
            timestamp: new Date().toISOString(),
            tipo: 'paso'
        });
        this.updateGraph(cduId);
    }

    handleToggleVisibility(btn) {
        const container = btn.closest('.pasos-container');
        const cduId = parseInt(container.dataset.cduId);
        
        this.toggleVisibilityInternal(container);

        // Persistir estado visual
        const content = container.querySelector('.pasos-content');
        const isExpanded = !content.classList.contains('hidden');
        this.dataStore.cduStore.togglePasosExpanded(cduId, isExpanded);
    }

    toggleVisibilityInternal(container, forceShow = false) {
        const content = container.querySelector('.pasos-content');
        const btn = container.querySelector('.btn-toggle-pasos');
        
        if (forceShow || content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            btn.innerHTML = `<svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
            btn.classList.add('active');
        } else {
            content.classList.add('hidden');
            btn.innerHTML = `<svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
            btn.classList.remove('active');
        }

        // Avisar al scroll virtual que el tamaño cambió
        if (this.renderer.virtualScroll) {
            setTimeout(() => this.renderer.virtualScroll.checkSizes(), 300);
        }
    }

    handlePasoCheck(target) {
        const cduId = parseInt(target.dataset.cduId);
        const index = parseInt(target.dataset.pasoIndex);
        const checked = target.checked;

        this.dataStore.cduStore.updatePaso(cduId, index, 'completado', checked);
        
        const item = target.closest('.paso-item');
        if (checked) item.classList.add('completed');
        else item.classList.remove('completed');

        this.updateSummary(cduId);

        this.dataStore.addPendingChange({
            cduId,
            campo: 'paso-completado',
            index,
            valorAnterior: !checked ? 'Sí' : 'No',
            valorNuevo: checked ? 'Sí' : 'No',
            timestamp: new Date().toISOString(),
            tipo: 'paso'
        });
    }

    updateSummary(cduId) {
        const container = document.querySelector(`[data-cdu-id="${cduId}"].pasos-container`);
        if (!container) return;
        
        const result = this.dataStore.cduStore.findCdu(cduId);
        if (!result) return;
        
        const pasos = result.cdu.pasos || [];
        const total = pasos.length;
        const completed = pasos.filter(p => p.completado).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        const countSpan = container.querySelector('.pasos-count-val');
        if (countSpan) countSpan.textContent = `${completed}/${total}`;

        const percentSpan = container.querySelector('.pasos-percent-val');
        if (percentSpan) {
            percentSpan.textContent = `${percentage}%`;
            percentSpan.classList.remove('percent-success', 'percent-progress', 'percent-zero');
            
            if (percentage === 100) percentSpan.classList.add('percent-success');
            else if (percentage > 0) percentSpan.classList.add('percent-progress');
            else percentSpan.classList.add('percent-zero');
        }
    }

    handlePasoChange(target, campo) {
        const cduId = parseInt(target.dataset.cduId);
        const index = parseInt(target.dataset.pasoIndex);
        const valor = target.value;

        this.dataStore.cduStore.updatePaso(cduId, index, campo, valor);
        
        this.dataStore.addPendingChange({
            cduId,
            campo: `paso-${campo}`,
            index,
            valorAnterior: '...',
            valorNuevo: valor,
            timestamp: new Date().toISOString(),
            tipo: 'paso'
        });

        if (campo === 'version') {
            this.updateGraph(cduId);
        }
    }

    async handleRemovePaso(btn) {
        const cduId = parseInt(btn.dataset.cduId);
        const index = parseInt(btn.dataset.pasoIndex);

        const confirmacion = await Modal.confirm('¿Eliminar este paso?', 'Eliminar', 'Cancelar');
        if (confirmacion) {
            const item = btn.closest('.paso-item');
            if (item) item.remove();

            const container = document.querySelector(`[data-cdu-id="${cduId}"].pasos-container`);
            const content = container ? container.querySelector('.pasos-content') : null;
            if (content && content.querySelectorAll('.paso-item').length === 0) {
                 const empty = document.createElement('div');
                 empty.className = 'pasos-empty';
                 empty.textContent = 'Sin pasos definidos';
                 const btnAdd = content.querySelector('.btn-add');
                 content.insertBefore(empty, btnAdd);
            }

            this.dataStore.cduStore.deletePaso(cduId, index);
            this.updateSummary(cduId);
            
            this.dataStore.addPendingChange({
                cduId,
                campo: 'paso-eliminado',
                index,
                valorAnterior: 'Paso',
                valorNuevo: null,
                timestamp: new Date().toISOString(),
                tipo: 'paso'
            });

            this.updateGraph(cduId);
            
            if (this.renderer.virtualScroll) {
                requestAnimationFrame(() => this.renderer.virtualScroll.checkSizes());
            }
        }
    }

    updateGraph(cduId) {
        const graphContainer = document.querySelector(`.bada-graph-container[data-cdu-id="${cduId}"]`);
        if (!graphContainer) return;

        const result = this.dataStore.cduStore.findCdu(cduId);
        if (!result || !result.cdu.pasos) return;

        const pasos = result.cdu.pasos;
        const total = pasos.length;

        if (total === 0) {
            graphContainer.innerHTML = '<span class="bada-graph-empty">N/A</span>';
            return;
        }

        const v1Count = pasos.filter(p => p.version === 'V1').length;
        const v2Count = pasos.filter(p => p.version === 'V2').length;

        const v1Percent = (v1Count / total) * 100;
        const v2Percent = (v2Count / total) * 100;

        let html = `
            <div class="bada-graph-bar">
                ${v1Count > 0 ? `<div class="bada-segment segment-v1" style="width: ${v1Percent}%"></div>` : ''}
                ${v2Count > 0 ? `<div class="bada-segment segment-v2" style="width: ${v2Percent}%"></div>` : ''}
            </div>
            <div class="bada-graph-labels">
                ${v1Count > 0 ? `<span class="label-v1">V1: ${Math.round(v1Percent)}%</span>` : ''}
                ${v2Count > 0 ? `<span class="label-v2">V2: ${Math.round(v2Percent)}%</span>` : ''}
            </div>
        `;

        graphContainer.innerHTML = html;
    }

    createPasoItemQuick(cduId, titulo, dificultad, version, completado, index) {
        const item = document.createElement('div');
        item.className = `paso-item ${completado ? 'completed' : ''}`;
        item.dataset.index = index;
        
        item.innerHTML = `
            <div class="paso-inputs-row">
                <div class="paso-check-container">
                    <input type="checkbox" class="paso-check" 
                        ${completado ? 'checked' : ''}
                        data-cdu-id="${cduId}" 
                        data-paso-index="${index}" 
                        data-campo="paso-completado">
                </div>
                <input type="text" class="paso-titulo" value="${titulo}" placeholder="Título del paso..." 
                    data-cdu-id="${cduId}" data-paso-index="${index}" data-campo="paso-titulo">
                <button class="btn-paso btn-remove" type="button" title="Eliminar" 
                    data-cdu-id="${cduId}" data-paso-index="${index}" data-action="remove-paso">×</button>
            </div>
            <div class="paso-meta-row">
                <select class="paso-dificultad ${dificultad.toLowerCase()}" 
                    data-cdu-id="${cduId}" data-paso-index="${index}" data-campo="paso-dificultad">
                    <option value="Baja" ${dificultad === 'Baja' ? 'selected' : ''}>Baja</option>
                    <option value="Media" ${dificultad === 'Media' ? 'selected' : ''}>Media</option>
                    <option value="Alta" ${dificultad === 'Alta' ? 'selected' : ''}>Alta</option>
                </select>
                <select class="paso-version" 
                    data-cdu-id="${cduId}" data-paso-index="${index}" data-campo="paso-version">
                    <option value="V1" ${version === 'V1' ? 'selected' : ''}>V1</option>
                    <option value="V2" ${version === 'V2' ? 'selected' : ''}>V2</option>
                </select>
            </div>
        `;
        return item;
    }
}