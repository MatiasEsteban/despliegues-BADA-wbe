// navigationEvents.js - Eventos de navegación entre vistas

import { Modal } from '../modals/Modal.js';
import { ComentariosModal } from '../modals/ComentariosModal.js';

export class NavigationEvents {
    constructor(dataStore, renderer) {
        this.dataStore = dataStore;
        this.renderer = renderer;
    }

    setup() {
        this.setupBackButton();
        this.setupEditCommentsButton();
        this.setupSearchToggle();
        this.setupViewToggle(); 
        this.setupPaginationEvents();
        
        // --- AÑADIDO ---
        this.setupActivityLogButtons(); 
        // --- FIN AÑADIDO ---

        console.log('✅ Eventos de navegación configurados');
    }

    /**
     * ¡NUEVO! Configura los botones para la vista de log.
     */
    setupActivityLogButtons() {
        const btnShowLog = document.getElementById('btn-activity-log');
        if (btnShowLog) {
            btnShowLog.addEventListener('click', () => {
                this.renderer.showActivityLogView();
            });
        }

        const btnBackFromLog = document.getElementById('btn-back-to-cards-from-activity');
        if (btnBackFromLog) {
            btnBackFromLog.addEventListener('click', () => {
                this.renderer.showCardsView();
            });
        }
    }

    setupBackButton() {
        const btnBack = document.getElementById('btn-back-to-cards');
        btnBack.addEventListener('click', () => {
            this.renderer.showCardsView();
        });
    }

    setupEditCommentsButton() {
        const btnEditComments = document.getElementById('btn-edit-version-comments');
        btnEditComments.addEventListener('click', async () => {
            if (!this.renderer.currentVersionId) return;
            
            const version = this.dataStore.getAll().find(v => v.id === this.renderer.currentVersionId);
            if (!version) return;
            
            // Guardar copia profunda para comparar
            const comentariosAnteriores = JSON.parse(JSON.stringify(
                version.comentarios || this.dataStore.getDefaultComentarios()
            ));
            
            const nuevosComentarios = await ComentariosModal.show(
                version.numero,
                version.comentarios
            );
            
            if (nuevosComentarios !== null) {
                // Registrar cambios pendientes
                this.registrarCambiosComentarios(version.id, comentariosAnteriores, nuevosComentarios, version.numero);
                
                // Actualizar en dataStore (esto dispara un notify)
                this.dataStore.updateVersion(this.renderer.currentVersionId, 'comentarios', nuevosComentarios);
                
                // Actualizar solo comentarios en la UI
                this.renderer.updateVersionComments();
            }
        });
    }

    setupSearchToggle() {
        const btnToggle = document.getElementById('btn-toggle-search');
        const filtersSection = document.querySelector('.filters-section');
        
        btnToggle.addEventListener('click', () => {
            const isCollapsed = filtersSection.classList.contains('filters-collapsed');
            
            if (isCollapsed) {
                filtersSection.classList.remove('filters-collapsed');
                btnToggle.classList.add('active');
            } else {
                filtersSection.classList.add('filters-collapsed');
                btnToggle.classList.remove('active');
            }
        });
    }
    
    setupViewToggle() {
        const actionsContainer = document.querySelector('.cards-actions');
        if (!actionsContainer) return;

        actionsContainer.addEventListener('click', (e) => {
            const btnGrid = e.target.closest('#btn-view-grid');
            const btnList = e.target.closest('#btn-view-list');

            if (!btnGrid && !btnList) return;

            const btnGridEl = document.getElementById('btn-view-grid');
            const btnListEl = document.getElementById('btn-view-list');

            if (btnGrid && !btnGridEl.classList.contains('active')) {
                this.renderer.cardViewMode = 'grid';
                btnGridEl.classList.add('active');
                btnListEl.classList.remove('active');
                this.renderer.renderCardsView(); // Re-render
            } else if (btnList && !btnListEl.classList.contains('active')) {
                this.renderer.cardViewMode = 'list';
                btnListEl.classList.add('active');
                btnGridEl.classList.remove('active');
                this.renderer.renderCardsView(); // Re-render
            }
        });
    }

    setupPaginationEvents() {
        const listContainer = document.getElementById('versions-list-container');
        if (!listContainer) return;
        
        listContainer.addEventListener('click', (e) => {
            const pageBtn = e.target.closest('.pagination-btn[data-page]');
            
            if (pageBtn && !pageBtn.disabled) {
                const page = parseInt(pageBtn.dataset.page);
                if (!isNaN(page)) {
                    this.renderer.changeListPage(page);
                }
            }
        });
    }

    registrarCambiosComentarios(versionId, anteriores, nuevos, versionNumero) {
        const categorias = ['mejoras', 'salidas', 'cambiosCaliente', 'observaciones'];
        
        categorias.forEach(categoria => {
            // Asegurarse de que 'anteriores' tenga la estructura correcta
            const itemsAnteriores = (anteriores && Array.isArray(anteriores[categoria])) ? anteriores[categoria] : [];
            const itemsNuevos = (nuevos && Array.isArray(nuevos[categoria])) ? nuevos[categoria] : [];
            
            if (itemsNuevos.length > itemsAnteriores.length) {
                for (let i = itemsAnteriores.length; i < itemsNuevos.length; i++) {
                    this.dataStore.addPendingChange({
                        versionId,
                        campo: `${categoria}-agregado`,
                        index: i,
                        valorAnterior: null,
                        valorNuevo: itemsNuevos[i],
                        versionNumero,
                        tipo: 'comentario-version'
                    });
                }
            }
            
            if (itemsNuevos.length < itemsAnteriores.length) {
                for (let i = itemsNuevos.length; i < itemsAnteriores.length; i++) {
                    this.dataStore.addPendingChange({
                        versionId,
                        campo: `${categoria}-eliminado`,
                        index: i,
                        valorAnterior: itemsAnteriores[i],
                        valorNuevo: null,
                        versionNumero,
                        tipo: 'comentario-version'
                    });
                }
            }
            
            const minLength = Math.min(itemsAnteriores.length, itemsNuevos.length);
            for (let i = 0; i < minLength; i++) {
                if (itemsAnteriores[i] !== itemsNuevos[i]) {
                    this.dataStore.addPendingChange({
                        versionId,
                        campo: `${categoria}-modificado`,
                        index: i,
                        valorAnterior: itemsAnteriores[i],
                        valorNuevo: itemsNuevos[i],
                        versionNumero,
                        tipo: 'comentario-version'
                    });
                }
            }
        });
    }
}