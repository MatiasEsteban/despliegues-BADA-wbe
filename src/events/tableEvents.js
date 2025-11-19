// tableEvents.js - Orquestador principal de eventos de tabla

import { CduFieldHandlers } from './handlers/CduFieldHandlers.js';
import { ResponsableHandlers } from './handlers/ResponsableHandlers.js';
import { ObservacionHandlers } from './handlers/ObservacionHandlers.js';
import { CduActionHandlers } from './handlers/CduActionHandlers.js';
import { PasoHandlers } from './handlers/PasoHandlers.js';

export class TableEvents {
    constructor(dataStore, renderer) {
        this.dataStore = dataStore;
        this.renderer = renderer;
        
        this.cduFieldHandlers = new CduFieldHandlers(dataStore, renderer);
        this.responsableHandlers = new ResponsableHandlers(dataStore, renderer);
        this.observacionHandlers = new ObservacionHandlers(dataStore, renderer);
        this.cduActionHandlers = new CduActionHandlers(dataStore, renderer);
        this.pasoHandlers = new PasoHandlers(dataStore, renderer);
    }

    setup() {
        this.setupTablaEvents();
        console.log('✅ Eventos de tabla configurados');
    }

    setupTablaEvents() {
        const tbody = document.getElementById('tabla-body');
        
        const autoResizeTextarea = (textarea) => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        };
        
        tbody.addEventListener('input', (e) => {
            if (e.target.tagName === 'TEXTAREA') {
                autoResizeTextarea(e.target);
            }
        });

        tbody.addEventListener('blur', (e) => {
            this.handleBlur(e);
        }, true);
        
        tbody.addEventListener('change', (e) => {
            this.handleChange(e);
        });

        tbody.addEventListener('click', async (e) => {
            await this.handleClick(e);
        });
        
        // Observer para auto-resize
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        const textareas = node.querySelectorAll ? node.querySelectorAll('.campo-descripcion') : [];
                        textareas.forEach(autoResizeTextarea);
                    }
                });
            });
        });
        
        observer.observe(tbody, { childList: true, subtree: true });
    }

    handleBlur(e) {
        const campo = e.target.dataset.campo;
        if (!campo) return;
        if (this.renderer.isRendering) return;

        const valor = e.target.value;

        if (campo === 'observacion') {
            this.observacionHandlers.handleObservacionBlur(e.target, valor);
        } 
        else if (campo === 'responsable-nombre') {
            this.responsableHandlers.handleResponsableNombreBlur(e.target, valor);
        }
        else if (campo === 'nombreCDU' || campo === 'descripcionCDU' || campo === 'versionMiro') {
            this.cduFieldHandlers.handleCduFieldBlur(e.target, campo, valor);
        }
        // NUEVO: Blur en título de paso
        else if (campo === 'paso-titulo') {
            this.pasoHandlers.handlePasoChange(e.target, 'titulo');
        }
    }

    handleChange(e) {
        if (this.renderer.isRendering) return;
        
        const campo = e.target.dataset.campo;

        if (e.target.classList.contains('campo-estado')) {
            this.cduFieldHandlers.handleEstadoChange(e.target);
        }
        else if (campo === 'responsable-rol') {
            this.responsableHandlers.handleRolChange(e.target);
        }
        // NUEVO: Selects y Checkbox de pasos
        else if (campo === 'paso-dificultad') {
            this.pasoHandlers.handlePasoChange(e.target, 'dificultad');
        }
        else if (campo === 'paso-version') {
            this.pasoHandlers.handlePasoChange(e.target, 'version');
        }
        else if (campo === 'paso-completado') {
            this.pasoHandlers.handlePasoCheck(e.target);
        }
    }

    async handleClick(e) {
        const btnHistorial = e.target.closest('[data-action="show-historial"]');
        if (btnHistorial) { await this.cduActionHandlers.handleHistorialClick(btnHistorial); return; }
        
        const btnEliminar = e.target.closest('.btn-eliminar');
        if (btnEliminar) { await this.cduActionHandlers.handleEliminarClick(btnEliminar); return; }
        
        const btnAddResp = e.target.closest('[data-action="add-responsable"]');
        if (btnAddResp) { this.responsableHandlers.handleAddResponsable(btnAddResp); return; }
        
        const btnRemoveResp = e.target.closest('[data-action="remove-responsable"]');
        if (btnRemoveResp) { await this.responsableHandlers.handleRemoveResponsable(btnRemoveResp); return; }
        
        const btnAddObs = e.target.closest('[data-action="add-observacion"]');
        if (btnAddObs) { this.observacionHandlers.handleAddObservacion(btnAddObs); return; }
        
        const btnRemoveObs = e.target.closest('[data-action="remove-observacion"]');
        if (btnRemoveObs) { await this.observacionHandlers.handleRemoveObservacion(btnRemoveObs); return; }

        // NUEVO: Botones de Pasos
        const btnTogglePasos = e.target.closest('[data-action="toggle-pasos"]');
        if (btnTogglePasos) { this.pasoHandlers.handleToggleVisibility(btnTogglePasos); return; }

        const btnAddPaso = e.target.closest('[data-action="add-paso"]');
        if (btnAddPaso) { this.pasoHandlers.handleAddPaso(btnAddPaso); return; }

        const btnRemovePaso = e.target.closest('[data-action="remove-paso"]');
        if (btnRemovePaso) { await this.pasoHandlers.handleRemovePaso(btnRemovePaso); return; }
    }
}