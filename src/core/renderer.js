// src/core/renderer.js

import { DOMBuilder } from '../components/domBuilder.js';
import { VirtualScroll } from '../components/table/VirtualScroll.js';
import { Debouncer } from '../utils/debouncer.js'; 
// --- IMPORTS AÑADIDOS ---
import { db } from './firebaseConfig.js';
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { NotificationSystem } from '../utils/notifications.js';
// --- FIN IMPORTS AÑADIDOS ---

window.DOMBuilder = DOMBuilder; 

export class Renderer {
    constructor(dataStore) {
        this.dataStore = dataStore;
        this.currentView = 'cards'; // 'cards', 'detail', o 'activity'
        this.currentVersionId = null;
        this.isRendering = false;

        // Estado de vista de tarjetas
        this.cardViewMode = 'grid'; // 'grid' o 'list'
        this.versionesVisibles = 10; 
        this.listCurrentPage = 1;
        this.listRowsPerPage = 10;

        // Instancia de VirtualScroll
        this.virtualScroll = new VirtualScroll({
            rowHeight: 120, 
            visibleRows: 10,
            bufferRows: 5
        });

        // Filtros
        this.filters = { search: '', estado: '', responsable: '', fechaDesde: '', fechaHasta: '' };
        this.detailFilters = { search: '', estado: '', responsable: '' };

        // Referencias a elementos
        this.gridContainer = null;
        this.listContainer = null;
        this.loadMoreContainer = null;
        this.viewCardsContainer = null;
    }

    _ensureContainers() {
        const currentViewCardsContainer = document.getElementById('view-cards');

        if (!currentViewCardsContainer) {
            console.error("Error Crítico: No se encontró #view-cards.");
            this.viewCardsContainer = null; this.gridContainer = null; this.listContainer = null; this.loadMoreContainer = null;
            return false;
        }

        if (this.viewCardsContainer !== currentViewCardsContainer || !this.gridContainer || !this.listContainer || !this.loadMoreContainer) {
            this.viewCardsContainer = currentViewCardsContainer;
            console.log("🔍 Buscando/Refrescando contenedores hijos...");

            this.gridContainer = this.viewCardsContainer.querySelector('#versions-grid');
            this.listContainer = this.viewCardsContainer.querySelector('#versions-list-container'); 
            this.loadMoreContainer = this.viewCardsContainer.querySelector('#load-more-container');

            if (!this.gridContainer || !this.listContainer || !this.loadMoreContainer) {
                console.error("Error Crítico: Faltan #versions-grid, #versions-list-container o #load-more-container dentro de #view-cards.");
                this.gridContainer = null; this.listContainer = null; this.loadMoreContainer = null; 
                return false;
            }
             if (!this.listContainer.querySelector('#versions-list')) {
                 console.error("Error Crítico: Falta el div #versions-list dentro de #versions-list-container.");
                 this.listContainer = null; 
                 return false;
             }
             if (!this.listContainer.querySelector('#list-pagination')) {
                  console.error("Error Crítico: Falta el div #list-pagination dentro de #versions-list-container.");
                  this.listContainer = null; 
                  return false;
             }

            console.log("✅ Contenedores hijos encontrados.");
        }
        return true;
    }

    // --- Métodos de cambio de vista (MODIFICADOS) ---
    showCardsView() {
        document.getElementById('view-cards')?.classList.add('active');
        document.getElementById('view-detail')?.classList.remove('active');
        document.getElementById('view-activity-log')?.classList.remove('active'); // <-- AÑADIDO
        this.currentView = 'cards';
        this.currentVersionId = null;
        
        this.versionesVisibles = 10;
        this.listCurrentPage = 1;
        this.renderCardsView(); 
    }

    showDetailView(versionId) {
        document.getElementById('view-cards')?.classList.remove('active');
        document.getElementById('view-detail')?.classList.add('active');
        document.getElementById('view-activity-log')?.classList.remove('active'); // <-- AÑADIDO
        this.currentView = 'detail';
        this.currentVersionId = versionId;
        this.renderDetailView(versionId); 
    }

    /**
     * ¡NUEVO! Muestra la vista de Registro de Actividad.
     */
    showActivityLogView() {
        document.getElementById('view-cards')?.classList.remove('active');
        document.getElementById('view-detail')?.classList.remove('active');
        document.getElementById('view-activity-log')?.classList.add('active'); // <-- AÑADIDO
        this.currentView = 'activity';
        this.currentVersionId = null;
        this.renderActivityLog(); // Llama al renderer del log
    }


    // --- Métodos de filtros (sin cambios) ---
     applyFilters(versiones) {
        const hasActiveFilters = this.filters.search ||
                                 this.filters.estado ||
                                 this.filters.responsable ||
                                 this.filters.fechaDesde ||
                                 this.filters.fechaHasta;

        if (!hasActiveFilters) {
            return versiones;
        }

        let filtered = versiones.map(version => {
            const cdus = Array.isArray(version.cdus) ? version.cdus : [];

            const filteredCdus = cdus.filter(cdu => {
                if (this.filters.search) {
                    const searchLower = this.filters.search.toLowerCase();
                    const versionNumMatch = version.numero?.toLowerCase().includes(searchLower); 
                    const cduNameMatch = cdu.nombreCDU?.toLowerCase().includes(searchLower); 
                    const cduDescMatch = cdu.descripcionCDU?.toLowerCase().includes(searchLower); 
                    const respMatch = this.getResponsablesText(cdu).toLowerCase().includes(searchLower);

                    if (!versionNumMatch && !cduNameMatch && !cduDescMatch && !respMatch) return false;
                }
                if (this.filters.estado && cdu.estado !== this.filters.estado) {
                    return false;
                }
                if (this.filters.responsable) {
                    const responsableLower = this.filters.responsable.toLowerCase();
                    if (!this.getResponsablesText(cdu).toLowerCase().includes(responsableLower)) {
                        return false;
                    }
                }
                 if (this.filters.fechaDesde && version.fechaDespliegue && version.fechaDespliegue < this.filters.fechaDesde) {
                    return false;
                 }
                 if (this.filters.fechaHasta && version.fechaDespliegue && version.fechaDespliegue > this.filters.fechaHasta) {
                    return false;
                 }
                return true; 
            });

            const versionNumberMatches = this.filters.search && version.numero?.toLowerCase().includes(this.filters.search.toLowerCase());
            return {
                ...version,
                cdus: filteredCdus,
                _keepVersion: versionNumberMatches
            };
        }).filter(version => version.cdus.length > 0 || version._keepVersion);

        filtered.forEach(v => delete v._keepVersion);
        return filtered;
    }

     getResponsablesText(cdu) {
        if (!cdu) return '';
        if (Array.isArray(cdu.responsables) && cdu.responsables.length > 0) {
            return cdu.responsables.map(r => `${r.nombre || ''} ${r.rol || ''}`).join(' ');
        } else if (cdu.responsable) { 
            return cdu.responsable;
        }
        return '';
    }

    updateFilterStats(filteredVersions, totalVersions) {
         const showingEl = document.getElementById('filter-showing');
         const totalEl = document.getElementById('filter-total');
         const versionsEl = document.getElementById('filter-versions');

         if (!showingEl || !totalEl || !versionsEl) {
              console.warn("Elementos de estadísticas de filtro no encontrados.");
              return;
         }

        const totalCdusAll = totalVersions.reduce((sum, v) => sum + (Array.isArray(v.cdus) ? v.cdus.length : 0), 0);
        const showingCdusFiltered = filteredVersions.reduce((sum, v) => sum + (Array.isArray(v.cdus) ? v.cdus.length : 0), 0);

        showingEl.textContent = showingCdusFiltered;
        totalEl.textContent = totalCdusAll; 
        versionsEl.textContent = filteredVersions.length; 
    }

    renderCardsView() {
        if (!this._ensureContainers()) {
            console.error("Renderizado de vista de tarjetas abortado.");
             if (this.viewCardsContainer) {
                 this.viewCardsContainer.innerHTML = '<p class="error-message">Error al cargar la interfaz. Recargue la página.</p>';
             }
            return;
        }

        if (this.cardViewMode === 'grid') {
            this.renderCardsGrid();
        } else {
            this.renderCardsList();
        }
         this.updateViewToggleButtons();
    }

     updateViewToggleButtons() {
         const btnGrid = document.getElementById('btn-view-grid');
         const btnList = document.getElementById('btn-view-list');
         if (!btnGrid || !btnList) return;

         if (this.cardViewMode === 'grid') {
             btnGrid.classList.add('active');
             btnList.classList.remove('active');
         } else {
             btnGrid.classList.remove('active');
             btnList.classList.add('active');
         }
     }

    renderCardsGrid() {
        if (!this._ensureContainers()) return;

        this.gridContainer.style.display = 'grid';
        this.listContainer.style.display = 'none'; 
        this.loadMoreContainer.style.display = 'flex'; 

        const allVersions = this.dataStore.getAll();
        const filteredVersions = this.applyFilters(allVersions);
        this.updateFilterStats(filteredVersions, allVersions); 

        this.gridContainer.innerHTML = ''; 

        if (filteredVersions.length === 0) {
            this.showNoVersionsMessage(this.gridContainer);
            this.updateLoadMoreButton(0, 0); 
            return;
        }

        const sortedVersions = [...filteredVersions].sort((a, b) => {
            const numA = parseInt(a.numero) || 0;
            const numB = parseInt(b.numero) || 0;
            return numB - numA;
        });

        const versionEnProduccionId = this.dataStore.getVersionEnProduccionId();
        const versionesToShow = sortedVersions.slice(0, this.versionesVisibles);

        console.log(`🎨 RENDER GRID - Mostrando ${versionesToShow.length} de ${sortedVersions.length} versiones filtradas.`);

        const fragment = document.createDocumentFragment(); 
        versionesToShow.forEach(version => {
            const isEnProduccion = version.id === versionEnProduccionId;
            const card = DOMBuilder.crearTarjetaVersion(version, (vId) => {
                this.showDetailView(vId);
            }, isEnProduccion);
            fragment.appendChild(card);
        });
        this.gridContainer.appendChild(fragment); 

        this.updateLoadMoreButton(versionesToShow.length, sortedVersions.length);
    }

    renderCardsList() {
        if (!this._ensureContainers()) return;

        this.gridContainer.style.display = 'none'; 
        this.listContainer.style.display = 'block'; 
        this.loadMoreContainer.style.display = 'none'; 

        const allVersions = this.dataStore.getAll();
        const filteredVersions = this.applyFilters(allVersions);
        this.updateFilterStats(filteredVersions, allVersions); 

        const listDiv = this.listContainer.querySelector('#versions-list'); 
        if (!listDiv) {
             console.error("Error: No se encontró #versions-list dentro de #versions-list-container");
             return;
        }
        listDiv.innerHTML = ''; 

        if (filteredVersions.length === 0) {
             this.showNoVersionsMessage(listDiv); 
             this.renderListPagination(0, 1); 
             return;
        }

        const sortedVersions = [...filteredVersions].sort((a, b) => {
             const numA = parseInt(a.numero) || 0;
             const numB = parseInt(b.numero) || 0;
             return numB - numA;
        });


        const totalVersions = sortedVersions.length;
        const totalPages = Math.ceil(totalVersions / this.listRowsPerPage);
        this.listCurrentPage = Math.max(1, Math.min(this.listCurrentPage, totalPages || 1));


        const startIndex = (this.listCurrentPage - 1) * this.listRowsPerPage;
        const endIndex = Math.min(startIndex + this.listRowsPerPage, totalVersions);
        const versionsToShow = sortedVersions.slice(startIndex, endIndex);

        console.log(`🎨 RENDER LIST - Página ${this.listCurrentPage}/${totalPages}. Mostrando [${startIndex}-${endIndex}] de ${totalVersions}`);

        const table = document.createElement('table');
        table.className = 'versions-list-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Versión</th>
                    <th>CDUs (Estado)</th> <th>Fuente</th>       <th>Creada</th>       <th>Despliegue</th>
                    <th>Info</th>
                    <th>Producción / Acciones</th>
                </tr>
            </thead>
        `;
        const tbody = document.createElement('tbody');
        const versionEnProduccionId = this.dataStore.getVersionEnProduccionId();

        const fragment = document.createDocumentFragment(); 
        versionsToShow.forEach(version => {
            const isEnProduccion = version.id === versionEnProduccionId;
            const row = DOMBuilder.crearFilaVersionLista(version, isEnProduccion, (vId) => {
                this.showDetailView(vId);
            });
            fragment.appendChild(row);
        });
        tbody.appendChild(fragment); 
        table.appendChild(tbody); 
        listDiv.appendChild(table); 

        this.renderListPagination(totalPages, this.listCurrentPage);
    }

    renderListPagination(totalPages, currentPage) {
        if (!this.listContainer) return; 

        const paginationContainer = this.listContainer.querySelector('#list-pagination');
        if (!paginationContainer) {
            console.error("Error: No se encontró #list-pagination");
            return;
        }
        paginationContainer.innerHTML = '';

        if (totalPages <= 1) return;

        const createButton = (text, page, isDisabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.className = 'pagination-btn';
            btn.innerHTML = text;
            btn.dataset.page = page;
            btn.disabled = isDisabled;
            if (isActive) btn.classList.add('active');
            return btn;
        };

        paginationContainer.appendChild(createButton('&laquo; Anterior', currentPage - 1, currentPage === 1));

        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        if (startPage > 1) {
            paginationContainer.appendChild(createButton('1', 1));
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.padding = '0.5rem';
                paginationContainer.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createButton(String(i), i, false, i === currentPage));
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.padding = '0.5rem';
                paginationContainer.appendChild(ellipsis);
            }
            paginationContainer.appendChild(createButton(String(totalPages), totalPages));
        }

        paginationContainer.appendChild(createButton('Siguiente &raquo;', currentPage + 1, currentPage === totalPages));
    }

    changeListPage(newPage) {
        if (!this._ensureContainers()) return;

        const allVersions = this.dataStore.getAll();
        const filteredVersions = this.applyFilters(allVersions);
        const totalPages = Math.ceil(filteredVersions.length / this.listRowsPerPage);

        const targetPage = Math.max(1, Math.min(newPage, totalPages || 1)); 

        if (targetPage !== this.listCurrentPage) {
             this.listCurrentPage = targetPage;
             this.renderCardsList(); 
        }
    }

    updateLoadMoreButton(showing, total) {
        if (!this.loadMoreContainer) return; 

        const btnLoadMore = this.loadMoreContainer.querySelector('#btn-load-more-versions');
        const countSpan = this.loadMoreContainer.querySelector('#versions-remaining-count');

        if (!btnLoadMore || !countSpan) {
            this.loadMoreContainer.style.display = 'none';
            return;
        }

        const remaining = total - showing;

        if (remaining > 0) {
            countSpan.textContent = remaining;
        } else {
            this.loadMoreContainer.style.display = 'none'; 
        }
    }

    cargarMasVersiones() {
        this.versionesVisibles += 10; 
        this.renderCardsView(); 
    }

    showNoVersionsMessage(container) {
        if (!container) return;
        const message = document.createElement('div');
        message.className = 'no-versions-message';
        const hasFilters = this.filters.search || this.filters.estado || this.filters.responsable || this.filters.fechaDesde || this.filters.fechaHasta;
        message.innerHTML = `
            <svg style="width: 64px; height: 64px; margin-bottom: 1rem; opacity: 0.5; color: var(--text-secondary);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="15"></line>
                <line x1="15" y1="9" x2="9" y2="15"></line>
            </svg>
            <div style="font-size: 1.25rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">
                No hay versiones disponibles
            </div>
            <div style="font-size: 0.95rem; color: var(--text-secondary);">
                ${hasFilters
                    ? 'Ninguna versión coincide con los filtros aplicados.'
                    : 'Crea una nueva versión o sube un archivo para comenzar.'
                }
            </div>`;
        message.style.gridColumn = '1 / -1'; 
        message.style.textAlign = 'center';
        message.style.padding = '4rem 2rem';
        container.innerHTML = ''; 
        container.appendChild(message);
    }

    renderDetailView(versionId) {
        const version = this.dataStore.getAll().find(v => v.id === versionId);

        if (!version) {
            console.warn(`Intento de renderizar detalle para versión ID ${versionId} no encontrada.`);
            this.showCardsView();
            return;
        }

        document.getElementById('detail-version-title').textContent = `Versión ${version.numero}`;
        document.getElementById('detail-version-creation-date').value = version.fechaCreacion || '';
        document.getElementById('detail-version-source').value = version.fuente || '';
        document.getElementById('detail-version-date').value = version.fechaDespliegue || '';
        document.getElementById('detail-version-time').value = version.horaDespliegue || '';

        const versionEnProduccionId = this.dataStore.getVersionEnProduccionId();
        const titleElement = document.getElementById('detail-version-title');
        const badgeHTML = `<span class="badge-produccion-inline">EN PRODUCCIÓN</span>`;
        
        const existingBadge = titleElement.querySelector('.badge-produccion-inline');
        if (existingBadge) existingBadge.remove();
        
        if (version.id === versionEnProduccionId) {
             titleElement.innerHTML += ` ${badgeHTML}`; 
        }

        this.updateVersionComments(version);

        console.log('🎨 RENDER DETAIL - Versión:', version.numero);
        console.log('  Total CDUs en version:', version.cdus?.length || 0);

        const tbody = document.getElementById('tabla-body');
        if (!tbody) {
             console.error("Error crítico: No se encontró tbody #tabla-body.");
             return;
        }

        const cdus = Array.isArray(version.cdus) ? version.cdus : []; 

        if (cdus.length === 0) {
            tbody.innerHTML = '';
            this.virtualScroll.cleanup();
            this.showNoCdusMessage(tbody);
            document.getElementById('detail-filter-showing').textContent = '0';
            document.getElementById('detail-filter-total').textContent = '0';
            return;
        }

        const cdusToRender = this.applyDetailFiltersInternal(cdus);
        this.virtualScroll.render(cdusToRender); 

        document.getElementById('detail-filter-showing').textContent = cdusToRender.length;
        document.getElementById('detail-filter-total').textContent = cdus.length; 

        requestAnimationFrame(() => {
            this.adjustTextareasInTbody(tbody);
        });
    }

     applyDetailFiltersInternal(cdus) {
        if (!Array.isArray(cdus)) return []; 

        const hasActiveFilters = this.detailFilters.search || this.detailFilters.estado || this.detailFilters.responsable;
        if (!hasActiveFilters) return cdus;

        const searchLower = this.detailFilters.search.toLowerCase();
        const estadoFilter = this.detailFilters.estado;
        const responsableLower = this.detailFilters.responsable.toLowerCase();

        return cdus.filter(cdu => {
            let matches = true;
            if (this.detailFilters.search) {
                const searchFields = [
                    cdu.nombreCDU,
                    cdu.descripcionCDU,
                    this.getResponsablesText(cdu),
                    ...(Array.isArray(cdu.observaciones) ? cdu.observaciones : [])
                ];
                const matchesSearch = searchFields.some(field => field && String(field).toLowerCase().includes(searchLower));
                if (!matchesSearch) matches = false;
            }
            if (matches && estadoFilter && cdu.estado !== estadoFilter) {
                matches = false;
            }
            if (matches && this.detailFilters.responsable) {
                if (!this.getResponsablesText(cdu).toLowerCase().includes(responsableLower)) {
                    matches = false;
                }
            }
            return matches;
        });
    }

   applyDetailFilters() {
       if (this.currentView !== 'detail' || !this.currentVersionId) return;

       const version = this.dataStore.getAll().find(v => v.id === this.currentVersionId);
       const cdus = (version && Array.isArray(version.cdus)) ? version.cdus : []; 

       const filteredCdus = this.applyDetailFiltersInternal(cdus);
       this.virtualScroll.updateData(filteredCdus); 

       const showingEl = document.getElementById('detail-filter-showing');
       const totalEl = document.getElementById('detail-filter-total');
       if(showingEl) showingEl.textContent = filteredCdus.length;
       if(totalEl) totalEl.textContent = cdus.length; 

        requestAnimationFrame(() => {
             const tbody = document.getElementById('tabla-body');
             if (tbody) this.adjustTextareasInTbody(tbody);
        });
   }

    adjustTextareasInTbody(tbody) {
        if (!tbody) return;
        tbody.querySelectorAll('.campo-descripcion').forEach(textarea => {
            if (textarea.closest('tr') && !textarea.closest('tr').classList.contains('virtual-scroll-spacer')) {
                textarea.style.height = 'auto'; 
                textarea.style.height = `${textarea.scrollHeight + 2}px`;
            }
        });
    }

    updateVersionComments(version = null) {
        if (this.currentView !== 'detail' || !this.currentVersionId) return;

        const versionToUse = version || this.dataStore.getAll().find(v => v.id === this.currentVersionId);
        if (!versionToUse) return;

        const commentsDisplay = document.getElementById('version-comments-display');
        const commentsContainer = document.getElementById('version-comments-container');
        if (!commentsDisplay || !commentsContainer) {
             console.warn("Elementos de comentarios no encontrados.");
             return; 
        }

        const comentarios = versionToUse.comentarios;
        const hasComentarios = this.tieneComentarios(comentarios);

        if (hasComentarios) {
            commentsContainer.innerHTML = this.renderComentariosCategorizados(comentarios);
            commentsDisplay.style.display = 'block';
            commentsContainer.style.opacity = '0';
             requestAnimationFrame(() => {
                 commentsContainer.style.transition = 'opacity 0.3s ease';
                 commentsContainer.style.opacity = '1';
             });
        } else {
            commentsDisplay.style.display = 'none';
        }
    }

    tieneComentarios(comentarios) {
        if (!comentarios) return false;
        if (typeof comentarios === 'string') return comentarios.trim().length > 0;
        return Object.values(comentarios).some(arr => Array.isArray(arr) && arr.length > 0);
    }

    renderComentariosCategorizados(comentarios) {
         let comentariosObj = comentarios;
         if (typeof comentarios === 'string') {
             comentariosObj = { mejoras: [], salidas: [], cambiosCaliente: [], observaciones: [comentarios] };
         } else if (!comentarios || typeof comentarios !== 'object') { 
              comentariosObj = { mejoras: [], salidas: [], cambiosCaliente: [], observaciones: [] };
         } else {
              comentariosObj = {
                   mejoras: Array.isArray(comentarios.mejoras) ? comentarios.mejoras : [],
                   salidas: Array.isArray(comentarios.salidas) ? comentarios.salidas : [],
                   cambiosCaliente: Array.isArray(comentarios.cambiosCaliente) ? comentarios.cambiosCaliente : [],
                   observaciones: Array.isArray(comentarios.observaciones) ? comentarios.observaciones : []
              };
         }

        let html = '';
         const iconos = {
            mejoras: `<svg class="cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"></path><path d="M8.5 2h7"></path><path d="M7 16h10"></path></svg>`,
            salidas: `<svg class="cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
            cambiosCaliente: `<svg class="cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
            observaciones: `<svg class="cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`
        };
        const categorias = [
            { key: 'mejoras', titulo: 'Mejoras y Bugfixes' },
            { key: 'salidas', titulo: 'Salidas a Producción' },
            { key: 'cambiosCaliente', titulo: 'Cambios en Caliente (CeC)' },
            { key: 'observaciones', titulo: 'Observaciones' }
        ];

         categorias.forEach(cat => {
             const items = comentariosObj[cat.key]; 
             const validItems = items.filter(item => item && String(item).trim());
             if (validItems.length > 0) {
                 const itemsHTML = validItems.map(item => `<li>${item}</li>`).join('');
                 html += `
                     <div class="comentario-display-categoria">
                         <div class="comentario-display-header">
                              ${iconos[cat.key] || ''}
                             <strong>${cat.titulo}</strong>
                         </div>
                         <ul class="comentario-display-list">
                             ${itemsHTML}
                         </ul>
                     </div>
                 `;
             }
         });

        return html || '<p style="padding: 1rem; color: var(--text-secondary); text-align: center;">No hay comentarios para esta versión.</p>';
    }

    showNoCdusMessage(tbody) {
        if (!tbody) return;
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <svg style="width: 48px; height: 48px; margin-bottom: 0.5rem; opacity: 0.5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg><br>
                    ${this.detailFilters.search || this.detailFilters.estado || this.detailFilters.responsable
                        ? 'Ningún CDU coincide con los filtros aplicados.'
                        : 'Esta versión no tiene CDUs asociados.'
                    }
                </td>
            </tr>`;
    }

    formatDate(dateString) {
         if (!dateString) return 'Sin fecha';
         try {
             const date = new Date(dateString + 'T00:00:00Z');
              if (isNaN(date)) return 'Fecha inválida';
             const day = date.getUTCDate().toString().padStart(2, '0');
             const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
             const year = date.getUTCFullYear();
             return `${day}/${month}/${year}`;
         } catch (e) { return 'Fecha inválida'; }
    }

    // --- Métodos de manejo de filtros (sin cambios) ---
    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
        if (this.currentView === 'cards') {
            this.listCurrentPage = 1; 
            this.versionesVisibles = 10; 
            this.renderCardsView();
        }
    }

    clearFilters() {
        this.filters = { search: '', estado: '', responsable: '', fechaDesde: '', fechaHasta: '' };
        
        const searchInput = document.getElementById('filter-search');
        const estadoSelect = document.getElementById('filter-estado');
        const responsableInput = document.getElementById('filter-responsable');
        const fechaDesdeInput = document.getElementById('filter-fecha-desde');
        const fechaHastaInput = document.getElementById('filter-fecha-hasta');
        if (searchInput) searchInput.value = '';
        if (estadoSelect) estadoSelect.value = '';
        if (responsableInput) responsableInput.value = '';
        if (fechaDesdeInput) fechaDesdeInput.value = '';
        if (fechaHastaInput) fechaHastaInput.value = '';

        if (this.currentView === 'cards') {
            this.listCurrentPage = 1;
            this.versionesVisibles = 10;
            this.renderCardsView();
        }
    }

    setDetailFilters(filters) {
        this.detailFilters = { ...this.detailFilters, ...filters };
        if (this.currentView === 'detail' && this.currentVersionId) {
            this.applyDetailFilters(); 
        }
    }

    clearDetailFilters() {
        this.detailFilters = { search: '', estado: '', responsable: '' };
        
        const searchInput = document.getElementById('detail-filter-search');
        const estadoSelect = document.getElementById('detail-filter-estado');
        const responsableInput = document.getElementById('detail-filter-responsable');
         if(searchInput) searchInput.value = '';
         if(estadoSelect) estadoSelect.value = '';
         if(responsableInput) responsableInput.value = '';

        if (this.currentView === 'detail' && this.currentVersionId) {
            this.applyDetailFilters(); 
        }
    }


    updateStats() {
        console.log('📊 Actualización de stats (solo consola)');
    }

    /**
     * ¡NUEVO! Renderiza la vista de registro de actividad.
     */
    async renderActivityLog() {
        const contentDiv = document.getElementById('activity-log-content');
        if (!contentDiv) {
            console.error("Error: #activity-log-content no encontrado.");
            return;
        }

        contentDiv.innerHTML = '<div class="activity-log-empty">Cargando registro...</div>';

        try {
            // Consultar los últimos 100 registros, ordenados por fecha (servidor)
            const q = query(collection(db, "activityLog"), orderBy("timestamp", "desc"), limit(100));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                contentDiv.innerHTML = '<div class="activity-log-empty">No hay actividad registrada.</div>';
                return;
            }

            const fragment = document.createDocumentFragment();
            querySnapshot.forEach(doc => {
                const log = doc.data();
                const entryDiv = this.createActivityLogEntry(log);
                fragment.appendChild(entryDiv);
            });

            contentDiv.innerHTML = ''; // Limpiar "Cargando..."
            contentDiv.appendChild(fragment);

        } catch (error) {
            console.error("Error al cargar el registro de actividad:", error);
            contentDiv.innerHTML = '<div class="activity-log-empty">Error al cargar el registro.</div>';
            NotificationSystem.error("Error al cargar el registro de actividad.");
        }
    }

    /**
     * ¡NUEVO! Helper para crear el HTML de una entrada de log.
     */
    createActivityLogEntry(log) {
        const entry = document.createElement('div');
        entry.className = 'activity-log-entry';

        const { userEmail, tipo, campo, valorNuevo, valorAnterior, versionNumero, cduNombre, timestamp } = log;
        
        let icon = '✏️';
        let message = `Modificación desconocida por ${userEmail}`;

        // Formatear el timestamp (si existe)
        let date = 'Fecha desconocida';
        if (timestamp && timestamp.toDate) {
            date = timestamp.toDate().toLocaleString('es-AR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        }

        // Generar mensaje basado en el tipo de cambio
        switch (tipo) {
            case 'creacion':
                icon = '✨';
                message = `<strong>${userEmail}</strong> creó un nuevo CDU en la <strong>Versión ${versionNumero}</strong>.`;
                break;
            case 'eliminacion':
                icon = '❌';
                message = `<strong>${userEmail}</strong> eliminó el CDU <strong>${cduNombre}</strong> de la <strong>Versión ${versionNumero}</strong>.`;
                break;
            case 'estado':
                icon = '🔄';
                message = `<strong>${userEmail}</strong> cambió el estado de <strong>${cduNombre}</strong> de "${valorAnterior}" a <strong>"${valorNuevo}"</strong> (Versión ${versionNumero}).`;
                break;
            case 'metadata-version':
                icon = '🗓️';
                message = `<strong>${userEmail}</strong> actualizó <strong>${campo}</strong> de la <strong>Versión ${versionNumero}</strong> a "${valorNuevo}".`;
                break;
            case 'version-produccion':
                icon = '⚡';
                const vNuevo = this.dataStore.getVersionNumberById(valorNuevo) || 'Ninguna';
                message = `<strong>${userEmail}</strong> cambió la versión en producción a <strong>V${vNuevo}</strong>.`;
                break;
            case 'responsable':
                icon = '👤';
                if (campo === 'responsable-agregado') message = `<strong>${userEmail}</strong> agregó un responsable a <strong>${cduNombre}</strong> (Versión ${versionNumero}).`;
                else if (campo === 'responsable-eliminado') message = `<strong>${userEmail}</strong> eliminó a <strong>${valorAnterior}</strong> de <strong>${cduNombre}</strong> (Versión ${versionNumero}).`;
                else message = `<strong>${userEmail}</strong> modificó un responsable en <strong>${cduNombre}</strong> (Versión ${versionNumero}).`;
                break;
            default:
                icon = '✏️';
                message = `<strong>${userEmail}</strong> actualizó <strong>${campo}</strong> de <strong>${cduNombre}</strong> a "${valorNuevo}" (Versión ${versionNumero}).`;
        }

        entry.innerHTML = `
            <div class="activity-log-icon">
                <span title="${tipo}">${icon}</span>
            </div>
            <div class="activity-log-details">
                <div class="activity-log-message">${message}</div>
                <div class="activity-log-meta">${date}</div>
            </div>
        `;
        return entry;
    }


    init() {
        // Asegurar contenedores y renderizar vista inicial
        this.showCardsView(); 
        
        // Suscribirse a cambios del DataStore
        this.dataStore.subscribe((versiones, options = {}) => {
            console.log('📬 DataStore notificado. Opciones:', options);
            
            if (this.currentView === 'cards' || options.fullRender) {
                 console.log(`🔄 Re-renderizando vista de tarjetas... (fullRender: ${!!options.fullRender})`);
                 if(options.fullRender || this.currentView !== 'cards') {
                     this.versionesVisibles = 10;
                     this.listCurrentPage = 1;
                 }
                 this.renderCardsView();
            }
             else if (this.currentView === 'detail' && !options.fullRender) {
                console.log('📊 Actualizando vista de detalle (sin fullRender)');
                this.updateVersionComments(); 
            }
             else if (this.currentView === 'activity' && options.fullRender) {
                 // Si estamos en el log y hay un fullRender, recargamos el log
                 this.renderActivityLog();
             }
        });
    }

    fullRender() {
        console.log('🎨 Ejecutando fullRender...');
        this.isRendering = true;

        try {
            if (this.currentView === 'cards') {
                this.cardViewMode = (this.cardViewMode === 'list') ? 'list' : 'grid'; 
                this.listCurrentPage = 1; 
                this.versionesVisibles = 10; 
                this.renderCardsView(); 
            } else if (this.currentView === 'detail' && this.currentVersionId) {
                 this.renderDetailView(this.currentVersionId); 
            } else if (this.currentView === 'activity') {
                 this.renderActivityLog(); // <-- AÑADIDO
            } else {
                 console.warn("FullRender llamado en estado inesperado:", this.currentView, this.currentVersionId);
                 this.showCardsView(); 
            }
        } catch (error) {
             console.error("❌ Error durante fullRender:", error);
             try { this.showCardsView(); } catch (e) { console.error("Error volviendo a vista tarjetas:", e); }
        } finally {
             requestAnimationFrame(() => {
                  this.isRendering = false;
                  console.log('🎨 fullRender completado.');
             });
        }
    }

} // Fin clase Renderer