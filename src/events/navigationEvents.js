// src/events/navigationEvents.js

import { Modal } from '../modals/Modal.js';
import { ComentariosModal } from '../modals/ComentariosModal.js';
import { ProgressModal } from '../modals/ProgressModal.js';

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
        this.setupProgressButton();
        this.setupCommentsToggle();
        console.log('✅ Eventos de navegación configurados');
    }

    setupBackButton() {
        // CORRECCIÓN: Usar delegación de eventos porque el botón se recrea al renderizar
        const viewDetail = document.getElementById('view-detail');
        if (!viewDetail) return;

        viewDetail.addEventListener('click', (e) => {
            const btnBack = e.target.closest('#btn-back-to-cards');
            if (btnBack) {
                this.renderer.showCardsView();
            }
        });
    }

    // Listener delegado para el botón de progreso
    setupProgressButton() {
        const viewDetail = document.getElementById('view-detail');
        if (!viewDetail) return;

        viewDetail.addEventListener('click', async (e) => {
            const btnProgress = e.target.closest('#btn-show-progress');
            if (btnProgress) {
                if (!this.renderer.currentVersionId) return;
                
                const version = this.dataStore.getById(this.renderer.currentVersionId);
                if (version) {
                    const progress = this.dataStore.statsCalculator.calculateVersionProgress(version.id);
                    await ProgressModal.show(version.numero, progress);
                }
            }
        });
    }

    // Listener delegado para toggles de comentarios
    setupCommentsToggle() {
        const container = document.getElementById('version-comments-container');
        if (!container) return;

        container.addEventListener('click', (e) => {
            const btnToggle = e.target.closest('[data-action="toggle-comment-cat"]');
            if (btnToggle) {
                const categoryDiv = btnToggle.closest('.comentario-display-categoria');
                const list = categoryDiv.querySelector('.comentario-display-list');
                const icon = btnToggle.querySelector('svg');
                
                if (list.classList.contains('hidden')) {
                    list.classList.remove('hidden');
                    // Flecha arriba
                    icon.innerHTML = '<polyline points="18 15 12 9 6 15"></polyline>';
                } else {
                    list.classList.add('hidden');
                    // Flecha abajo
                    icon.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';
                }
            }
        });
    }

    setupEditCommentsButton() {
        const viewDetail = document.getElementById('view-detail');
        if (!viewDetail) return;

        viewDetail.addEventListener('click', async (e) => {
            const btnEdit = e.target.closest('#btn-edit-version-comments');
            if (btnEdit) {
                if (!this.renderer.currentVersionId) return;
                
                const version = this.dataStore.getAll().find(v => v.id === this.renderer.currentVersionId);
                if (!version) return;
                
                const comentariosAnteriores = JSON.parse(JSON.stringify(version.comentarios));
                
                const nuevosComentarios = await ComentariosModal.show(
                    version.numero,
                    version.comentarios
                );
                
                if (nuevosComentarios !== null) {
                    this.registrarCambiosComentarios(version.id, comentariosAnteriores, nuevosComentarios, version.numero);
                    this.dataStore.updateVersion(this.renderer.currentVersionId, 'comentarios', nuevosComentarios);
                    this.renderer.updateVersionComments();
                    this.renderer.updateStats();
                }
            }
        });
    }

    setupSearchToggle() {
        const btnToggle = document.getElementById('btn-toggle-search');
        const filtersSection = document.querySelector('.filters-section');
        
        if (btnToggle) {
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
                this.renderer.renderCardsView();
            } else if (btnList && !btnListEl.classList.contains('active')) {
                this.renderer.cardViewMode = 'list';
                btnListEl.classList.add('active');
                btnGridEl.classList.remove('active');
                this.renderer.renderCardsView();
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
            const itemsAnteriores = anteriores[categoria] || [];
            const itemsNuevos = nuevos[categoria] || [];
            
            if (itemsNuevos.length > itemsAnteriores.length) {
                for (let i = itemsAnteriores.length; i < itemsNuevos.length; i++) {
                    this.dataStore.addPendingChange({
                        versionId,
                        campo: `${categoria}-agregado`,
                        index: i,
                        valorAnterior: null,
                        valorNuevo: itemsNuevos[i],
                        versionNumero,
                        timestamp: new Date().toISOString(),
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
                        timestamp: new Date().toISOString(),
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
                        timestamp: new Date().toISOString(),
                        tipo: 'comentario-version'
                    });
                }
            }
        });
    }
}