// src/core/renderer.js

import { DOMBuilder } from '../components/domBuilder.js';
import { VirtualScroll } from '../components/table/VirtualScroll.js';
import { Debouncer } from '../utils/debouncer.js';

window.DOMBuilder = DOMBuilder;

export class Renderer {
    constructor(dataStore) {
        this.dataStore = dataStore;
        this.currentView = 'cards';
        this.currentVersionId = null;
        this.isRendering = false;

        this.cardViewMode = 'grid';
        this.versionesVisibles = 10;
        this.listCurrentPage = 1;
        this.listRowsPerPage = 10;

        this.virtualScroll = new VirtualScroll({
            rowHeight: 120,
            visibleRows: 10,
            bufferRows: 5
        });

        this.filters = { search: '', estado: '', responsable: '', fechaDesde: '', fechaHasta: '' };
        this.detailFilters = { search: '', estado: '', responsable: '' };

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
            this.gridContainer = this.viewCardsContainer.querySelector('#versions-grid');
            this.listContainer = this.viewCardsContainer.querySelector('#versions-list-container');
            this.loadMoreContainer = this.viewCardsContainer.querySelector('#load-more-container');

            if (!this.gridContainer || !this.listContainer || !this.loadMoreContainer) {
                return false;
            }
        }
        return true;
    }

    showCardsView() {
        document.getElementById('view-cards')?.classList.add('active');
        document.getElementById('view-detail')?.classList.remove('active');
        this.currentView = 'cards';
        this.currentVersionId = null;
        this.versionesVisibles = 10;
        this.listCurrentPage = 1;
        this.renderCardsView();
    }

    showDetailView(versionId) {
        document.getElementById('view-cards')?.classList.remove('active');
        document.getElementById('view-detail')?.classList.add('active');
        this.currentView = 'detail';
        this.currentVersionId = versionId;
        this.renderDetailView(versionId);
    }

    // --- Filtros ---
    applyFilters(versiones) {
        const hasActiveFilters = this.filters.search || this.filters.estado || this.filters.responsable || this.filters.fechaDesde || this.filters.fechaHasta;
        if (!hasActiveFilters) return versiones;

        let filtered = versiones.map(version => {
            const cdus = Array.isArray(version.cdus) ? version.cdus : [];
            const filteredCdus = cdus.filter(cdu => {
                if (this.filters.search) {
                    const searchLower = this.filters.search.toLowerCase();
                    const match = (version.numero || '').toLowerCase().includes(searchLower) || 
                                  (cdu.nombreCDU || '').toLowerCase().includes(searchLower) || 
                                  (cdu.descripcionCDU || '').toLowerCase().includes(searchLower) ||
                                  this.getResponsablesText(cdu).toLowerCase().includes(searchLower);
                    if (!match) return false;
                }
                if (this.filters.estado && cdu.estado !== this.filters.estado) return false;
                if (this.filters.responsable && !this.getResponsablesText(cdu).toLowerCase().includes(this.filters.responsable.toLowerCase())) return false;
                if (this.filters.fechaDesde && version.fechaDespliegue && version.fechaDespliegue < this.filters.fechaDesde) return false;
                if (this.filters.fechaHasta && version.fechaDespliegue && version.fechaDespliegue > this.filters.fechaHasta) return false;
                return true;
            });
            
            const versionMatch = this.filters.search && (version.numero || '').toLowerCase().includes(this.filters.search.toLowerCase());
            return { ...version, cdus: filteredCdus, _keepVersion: versionMatch };
        }).filter(v => v.cdus.length > 0 || v._keepVersion);
        
        filtered.forEach(v => delete v._keepVersion);
        return filtered;
    }

    getResponsablesText(cdu) {
        if (!cdu) return '';
        if (Array.isArray(cdu.responsables)) return cdu.responsables.map(r => `${r.nombre} ${r.rol}`).join(' ');
        return cdu.responsable || '';
    }

    updateFilterStats(filtered, total) {
        const showingEl = document.getElementById('filter-showing');
        const totalEl = document.getElementById('filter-total');
        const versionsEl = document.getElementById('filter-versions');
        if (!showingEl) return;

        const totalCount = total.reduce((sum, v) => sum + (v.cdus?.length || 0), 0);
        const showCount = filtered.reduce((sum, v) => sum + (v.cdus?.length || 0), 0);

        showingEl.textContent = showCount;
        totalEl.textContent = totalCount;
        versionsEl.textContent = filtered.length;
    }

    // --- Render Cards ---
    renderCardsView() {
        if (!this._ensureContainers()) return;
        if (this.cardViewMode === 'grid') this.renderCardsGrid();
        else this.renderCardsList();
        this.updateViewToggleButtons();
    }

    updateViewToggleButtons() {
        const btnGrid = document.getElementById('btn-view-grid');
        const btnList = document.getElementById('btn-view-list');
        if (this.cardViewMode === 'grid') {
            btnGrid?.classList.add('active');
            btnList?.classList.remove('active');
        } else {
            btnGrid?.classList.remove('active');
            btnList?.classList.add('active');
        }
    }

    renderCardsGrid() {
        if (!this._ensureContainers()) return;
        this.gridContainer.style.display = 'grid';
        this.listContainer.style.display = 'none';
        this.loadMoreContainer.style.display = 'flex';

        const all = this.dataStore.getAll();
        const filtered = this.applyFilters(all);
        this.updateFilterStats(filtered, all);

        this.gridContainer.innerHTML = '';
        if (filtered.length === 0) {
            this.showNoVersionsMessage(this.gridContainer);
            this.updateLoadMoreButton(0, 0);
            return;
        }

        const sorted = [...filtered].sort((a, b) => (parseInt(b.numero)||0) - (parseInt(a.numero)||0));
        const show = sorted.slice(0, this.versionesVisibles);
        const prodId = this.dataStore.getVersionEnProduccionId();

        const frag = document.createDocumentFragment();
        show.forEach(v => {
            frag.appendChild(DOMBuilder.crearTarjetaVersion(v, (id) => this.showDetailView(id), v.id === prodId));
        });
        this.gridContainer.appendChild(frag);
        this.updateLoadMoreButton(show.length, sorted.length);
    }

    renderCardsList() {
        if (!this._ensureContainers()) return;
        this.gridContainer.style.display = 'none';
        this.listContainer.style.display = 'block';
        this.loadMoreContainer.style.display = 'none';

        const all = this.dataStore.getAll();
        const filtered = this.applyFilters(all);
        this.updateFilterStats(filtered, all);
        
        const listDiv = this.listContainer.querySelector('#versions-list');
        listDiv.innerHTML = '';

        if (filtered.length === 0) {
            this.showNoVersionsMessage(listDiv);
            return;
        }

        const sorted = [...filtered].sort((a, b) => (parseInt(b.numero)||0) - (parseInt(a.numero)||0));
        const totalPages = Math.ceil(sorted.length / this.listRowsPerPage);
        this.listCurrentPage = Math.max(1, Math.min(this.listCurrentPage, totalPages));
        
        const start = (this.listCurrentPage - 1) * this.listRowsPerPage;
        const show = sorted.slice(start, start + this.listRowsPerPage);
        const prodId = this.dataStore.getVersionEnProduccionId();

        const table = document.createElement('table');
        table.className = 'versions-list-table';
        table.innerHTML = `<thead><tr><th>Versión</th><th>CDUs</th><th>Fuente</th><th>Creada</th><th>Despliegue</th><th>Info</th><th>Acciones</th></tr></thead>`;
        const tbody = document.createElement('tbody');
        show.forEach(v => {
            tbody.appendChild(DOMBuilder.crearFilaVersionLista(v, v.id === prodId, (id) => this.showDetailView(id)));
        });
        table.appendChild(tbody);
        listDiv.appendChild(table);
        
        this.renderListPagination(totalPages, this.listCurrentPage);
    }

    renderListPagination(total, current) {
        const container = this.listContainer.querySelector('#list-pagination');
        container.innerHTML = '';
        if (total <= 1) return;

        const createBtn = (txt, p, dis, act) => {
            const b = document.createElement('button');
            b.className = `pagination-btn ${act ? 'active' : ''}`;
            b.innerHTML = txt;
            b.dataset.page = p;
            b.disabled = dis;
            return b;
        };

        container.appendChild(createBtn('«', current - 1, current === 1));
        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
                container.appendChild(createBtn(i, i, false, i === current));
            } else if (container.lastChild.textContent !== '...') {
                const sp = document.createElement('span'); sp.textContent = '...'; container.appendChild(sp);
            }
        }
        container.appendChild(createBtn('»', current + 1, current === total));
    }

    changeListPage(page) {
        this.listCurrentPage = page;
        this.renderCardsList();
    }

    updateLoadMoreButton(show, total) {
        const btn = this.loadMoreContainer.querySelector('#btn-load-more-versions');
        const span = this.loadMoreContainer.querySelector('#versions-remaining-count');
        if (!btn) return;
        
        if (total > show) {
            this.loadMoreContainer.style.display = 'flex';
            span.textContent = total - show;
        } else {
            this.loadMoreContainer.style.display = 'none';
        }
    }

    cargarMasVersiones() {
        this.versionesVisibles += 10;
        this.renderCardsView();
    }

    showNoVersionsMessage(container) {
        container.innerHTML = `<div class="no-versions-message">No hay versiones disponibles.</div>`;
    }

    // --- RENDER DETAIL VIEW ---
    renderDetailView(versionId) {
        const version = this.dataStore.getAll().find(v => v.id === versionId);
        if (!version) { this.showCardsView(); return; }

        const header = document.querySelector('.version-detail-header');
        header.innerHTML = `
            <button id="btn-back-to-cards" class="btn btn-back">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Volver
            </button>

            <div class="version-detail-info">
                <h2 id="detail-version-title">Versión ${version.numero} ${
                    version.id === this.dataStore.getVersionEnProduccionId() ? '<span class="badge-produccion-inline">EN PRODUCCIÓN</span>' : ''
                }</h2>
                <div class="version-detail-meta">
                    <div class="version-meta-field"><div class="input-group"><label>Fecha Creación</label><input type="date" id="detail-version-creation-date" class="version-date-input" value="${version.fechaCreacion || ''}"></div></div>
                    <div class="version-meta-field"><div class="input-group"><label>Hora Creación</label><input type="time" id="detail-version-creation-time" class="version-time-input" value="${version.horaCreacion || ''}"></div></div>
                    <span class="separator">•</span>
                    <div class="version-meta-field"><div class="input-group"><label>Fuente</label><input type="text" id="detail-version-source" class="version-source-input" value="${version.fuente || ''}"></div></div>
                    <span class="separator">•</span>
                    <div class="version-meta-field"><div class="input-group"><label>Fecha Despliegue</label><input type="date" id="detail-version-date" class="version-date-input" value="${version.fechaDespliegue || ''}"></div></div>
                    <div class="version-meta-field"><div class="input-group"><label>Hora Despliegue</label><input type="time" id="detail-version-time" class="version-time-input" value="${version.horaDespliegue || ''}"></div></div>
                </div>
            </div>

            <div class="version-header-buttons">
                <button id="btn-show-progress" class="btn btn-info">Progreso</button>
                <button id="btn-edit-version-comments" class="btn btn-secondary">Comentarios</button>
            </div>
        `;

        this.updateVersionComments(version);

        const tbody = document.getElementById('tabla-body');
        const cdus = Array.isArray(version.cdus) ? version.cdus : [];
        
        if (cdus.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;">Sin CDUs</td></tr>';
            this.virtualScroll.cleanup();
            return;
        }

        const toRender = this.applyDetailFiltersInternal(cdus);
        this.virtualScroll.render(toRender);
        
        document.getElementById('detail-filter-showing').textContent = toRender.length;
        document.getElementById('detail-filter-total').textContent = cdus.length;
        
        requestAnimationFrame(() => this.adjustTextareasInTbody(tbody));
    }

    applyDetailFiltersInternal(cdus) {
        const { search, estado, responsable } = this.detailFilters;
        if (!search && !estado && !responsable) return cdus;
        
        const sLow = search.toLowerCase();
        const rLow = responsable.toLowerCase();

        return cdus.filter(c => {
            if (estado && c.estado !== estado) return false;
            if (responsable && !this.getResponsablesText(c).toLowerCase().includes(rLow)) return false;
            if (search) {
                const txt = `${c.nombreCDU} ${c.descripcionCDU} ${this.getResponsablesText(c)}`.toLowerCase();
                if (!txt.includes(sLow)) return false;
            }
            return true;
        });
    }
    
    applyDetailFilters() {
        if (this.currentView !== 'detail' || !this.currentVersionId) return;
        const v = this.dataStore.getById(this.currentVersionId);
        if(v) {
            const filtered = this.applyDetailFiltersInternal(v.cdus);
            this.virtualScroll.updateData(filtered);
            document.getElementById('detail-filter-showing').textContent = filtered.length;
        }
    }

    adjustTextareasInTbody(tbody) {
        tbody.querySelectorAll('textarea').forEach(ta => {
             ta.style.height = 'auto';
             ta.style.height = ta.scrollHeight + 'px';
        });
    }

    updateVersionComments(version = null) {
        if (this.currentView !== 'detail' || !this.currentVersionId) return;

        const versionToUse = version || this.dataStore.getAll().find(v => v.id === this.currentVersionId);
        if (!versionToUse) return;

        const commentsDisplay = document.getElementById('version-comments-display');
        const commentsContainer = document.getElementById('version-comments-container');
        if (!commentsDisplay || !commentsContainer) return;

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

    /**
     * Renderiza comentarios categorizados con toggle (CORREGIDO: Visibles por defecto)
     */
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
                 // CORRECCIÓN: NO TIENE CLASE "HIDDEN" Y FLECHA APUNTA ARRIBA
                 html += `
                     <div class="comentario-display-categoria">
                         <div class="comentario-display-header">
                             <div class="comentario-header-title">
                                  ${iconos[cat.key] || ''}
                                 <strong>${cat.titulo}</strong>
                             </div>
                             <button class="btn-toggle-comment" data-action="toggle-comment-cat" title="Mostrar/Ocultar">
                                 <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="18 15 12 9 6 15"></polyline>
                                 </svg>
                             </button>
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
                <td colspan="9" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
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

    updateStats() { console.log('📊 Actualización de stats (solo consola)'); }

    init() {
        this.showCardsView();
        this.dataStore.subscribe((data, opts) => {
            if (this.currentView === 'cards' || opts.fullRender) {
                if(opts.fullRender) this.renderCardsView();
                else if(this.currentView === 'cards') this.renderCardsView();
            }
             else if (this.currentView === 'detail' && !options.fullRender) {
                this.updateVersionComments();
            }
        });
    }

    fullRender() {
        this.isRendering = true;
        try {
            if (this.currentView === 'cards') {
                this.cardViewMode = (this.cardViewMode === 'list') ? 'list' : 'grid';
                this.listCurrentPage = 1;
                this.versionesVisibles = 10;
                this.renderCardsView();
            } else if (this.currentView === 'detail' && this.currentVersionId) {
                 this.renderDetailView(this.currentVersionId);
            } else {
                 this.showCardsView();
            }
        } catch (error) {
             console.error("❌ Error durante fullRender:", error);
             try { this.showCardsView(); } catch (e) {}
        } finally {
             requestAnimationFrame(() => { this.isRendering = false; });
        }
    }
}