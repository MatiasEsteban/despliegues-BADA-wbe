// tableEvents.js - Orquestador principal de eventos de tabla (REFACTORIZADO)

import { CduFieldHandlers } from './handlers/CduFieldHandlers.js';
import { ResponsableHandlers } from './handlers/ResponsableHandlers.js';
import { ObservacionHandlers } from './handlers/ObservacionHandlers.js';
import { CduActionHandlers } from './handlers/CduActionHandlers.js';

export class TableEvents {
    constructor(dataStore, renderer) {
        this.dataStore = dataStore;
        this.renderer = renderer;
        
        // Inicializar handlers especializados
        this.cduFieldHandlers = new CduFieldHandlers(dataStore, renderer);
        this.responsableHandlers = new ResponsableHandlers(dataStore, renderer);
        this.observacionHandlers = new ObservacionHandlers(dataStore, renderer);
        this.cduActionHandlers = new CduActionHandlers(dataStore, renderer);
    }

    setup() {
        this.setupTablaEvents();
        console.log('✅ Eventos de tabla configurados');
    }

    /**
     * Configura los event listeners principales de la tabla
     */
    setupTablaEvents() {
        const tbody = document.getElementById('tabla-body');
        
        // Auto-resize de textareas
        const autoResizeTextarea = (textarea) => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        };
        
        // Event listener para input (auto-resize)
        tbody.addEventListener('input', (e) => {
            if (e.target.tagName === 'TEXTAREA') {
                autoResizeTextarea(e.target);
            }
        });

        // Event listener para blur
        tbody.addEventListener('blur', (e) => {
            this.handleBlur(e);
        }, true);
        
        // Event listener para change (select)
        tbody.addEventListener('change', (e) => {
            this.handleChange(e);
        });

        // Event listener para clicks (botones)
        tbody.addEventListener('click', async (e) => {
            await this.handleClick(e);
        });
        
        // Observer para ajustar textareas dinámicamente
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

    /**
     * Maneja eventos de blur (pérdida de foco)
     * Delega a handlers específicos según el campo
     */
    handleBlur(e) {
        const campo = e.target.dataset.campo;
        if (!campo) return;
        if (this.renderer.isRendering) return;

        const valor = e.target.value;
        

// Delegar según el tipo de campo
        if (campo === 'observacion') {
            this.observacionHandlers.handleObservacionBlur(e.target, valor);
        } 
        else if (campo === 'responsable-nombre') {
            this.responsableHandlers.handleResponsableNombreBlur(e.target, valor);
        }
        else if (campo === 'nombreCDU' || campo === 'descripcionCDU' || campo === 'versionMiro') { // CAMPO AÑADIDO
            this.cduFieldHandlers.handleCduFieldBlur(e.target, campo, valor);
        }
    }

    /**
     * Maneja eventos de change (selects)
     * Delega a handlers específicos según el campo
     */
    handleChange(e) {
        if (this.renderer.isRendering) return;
        
        // Delegar según el tipo de campo
        if (e.target.classList.contains('campo-estado')) {
            this.cduFieldHandlers.handleEstadoChange(e.target);
        }
        else if (e.target.dataset.campo === 'responsable-rol') {
            this.responsableHandlers.handleRolChange(e.target);
        }
        else if (e.target.dataset.campo === 'versionBADA') {
            this.cduFieldHandlers.handleVersionBADAChange(e.target);
        }
    }

    /**
     * Maneja eventos de click en botones
     * Delega a handlers específicos según la acción
     */
    async handleClick(e) {
        // Historial de CDU
        const btnHistorial = e.target.closest('[data-action="show-historial"]');
        if (btnHistorial) {
            await this.cduActionHandlers.handleHistorialClick(btnHistorial);
            return;
        }
        
        // Eliminar CDU
        const btnEliminar = e.target.closest('.btn-eliminar');
        if (btnEliminar) {
            await this.cduActionHandlers.handleEliminarClick(btnEliminar);
            return;
        }
        
        // Agregar responsable
        const btnAddResp = e.target.closest('[data-action="add-responsable"]');
        if (btnAddResp) {
            this.responsableHandlers.handleAddResponsable(btnAddResp);
            return;
        }
        
        // Eliminar responsable
        const btnRemoveResp = e.target.closest('[data-action="remove-responsable"]');
        if (btnRemoveResp) {
            await this.responsableHandlers.handleRemoveResponsable(btnRemoveResp);
            return;
        }
        
        // Agregar observación
        const btnAdd = e.target.closest('[data-action="add-observacion"]');
        if (btnAdd) {
            this.observacionHandlers.handleAddObservacion(btnAdd);
            return;
        }
        
        // Eliminar observación
        const btnRemove = e.target.closest('[data-action="remove-observacion"]');
        if (btnRemove) {
            await this.observacionHandlers.handleRemoveObservacion(btnRemove);
            return;
        }
    }
}