// filterEvents.js - Eventos de filtros

import { Debouncer } from '../utils/debouncer.js';
import { NotificationSystem } from '../utils/notifications.js';

export class FilterEvents {
    constructor(dataStore, renderer) {
        this.dataStore = dataStore;
        this.renderer = renderer;
    }

    setup() {
        this.setupFilterEvents();
        this.setupDetailFilterEvents();
        console.log('✅ Eventos de filtros configurados');
    }

    setupFilterEvents() {
        const debouncedSearchFilter = Debouncer.debounce((value) => {
            this.renderer.setFilters({ search: value });
        }, 300);
        
        const debouncedResponsableFilter = Debouncer.debounce((value) => {
            this.renderer.setFilters({ responsable: value });
        }, 300);

        const filterSearch = document.getElementById('filter-search');
        filterSearch.addEventListener('input', (e) => {
            debouncedSearchFilter(e.target.value);
        });

        const filterEstado = document.getElementById('filter-estado');
        filterEstado.addEventListener('change', (e) => {
            this.renderer.setFilters({ estado: e.target.value });
        });

        const filterResponsable = document.getElementById('filter-responsable');
        filterResponsable.addEventListener('input', (e) => {
            debouncedResponsableFilter(e.target.value);
        });

        const filterFechaDesde = document.getElementById('filter-fecha-desde');
        filterFechaDesde.addEventListener('change', (e) => {
            this.renderer.setFilters({ fechaDesde: e.target.value });
        });

        const filterFechaHasta = document.getElementById('filter-fecha-hasta');
        filterFechaHasta.addEventListener('change', (e) => {
            this.renderer.setFilters({ fechaHasta: e.target.value });
        });

        const btnClearFilters = document.getElementById('btn-clear-filters');
        btnClearFilters.addEventListener('click', () => {
            this.renderer.clearFilters();
        });
    }

    setupDetailFilterEvents() {
        const btnToggle = document.getElementById('btn-toggle-detail-search');
        const filtersContent = document.querySelector('.detail-filters-content');
        
        btnToggle.addEventListener('click', () => {
            const isCollapsed = filtersContent.classList.contains('detail-filters-collapsed');
            
            if (isCollapsed) {
                filtersContent.classList.remove('detail-filters-collapsed');
                btnToggle.classList.add('active');
            } else {
                filtersContent.classList.add('detail-filters-collapsed');
                btnToggle.classList.remove('active');
            }
        });
        
        const debouncedDetailSearch = Debouncer.debounce((value) => {
            this.renderer.setDetailFilters({ search: value });
        }, 300);
        
        const debouncedDetailResponsable = Debouncer.debounce((value) => {
            this.renderer.setDetailFilters({ responsable: value });
        }, 300);
        
        const detailFilterSearch = document.getElementById('detail-filter-search');
        detailFilterSearch.addEventListener('input', (e) => {
            debouncedDetailSearch(e.target.value);
        });
        
        const detailFilterEstado = document.getElementById('detail-filter-estado');
        detailFilterEstado.addEventListener('change', (e) => {
            this.renderer.setDetailFilters({ estado: e.target.value });
        });
        
        const detailFilterResponsable = document.getElementById('detail-filter-responsable');
        detailFilterResponsable.addEventListener('input', (e) => {
            debouncedDetailResponsable(e.target.value);
        });
        
        const btnClearDetailFilters = document.getElementById('btn-clear-detail-filters');
        btnClearDetailFilters.addEventListener('click', () => {
            this.renderer.clearDetailFilters();
            NotificationSystem.info('Filtros limpiados', 2000);
        });
    }
}