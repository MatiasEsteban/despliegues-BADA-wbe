// src/core/renderer.js

import { DOMBuilder } from '../components/domBuilder.js';
import { VirtualScroll } from '../components/table/VirtualScroll.js';
import { Debouncer } from '../utils/debouncer.js'; // Asegúrate que Debouncer esté importado

window.DOMBuilder = DOMBuilder; // Asegura acceso global si es necesario

export class Renderer {
    constructor(dataStore) {
        this.dataStore = dataStore;
        this.currentView = 'cards'; // 'cards' o 'detail'
        this.currentVersionId = null;
        this.isRendering = false;

        // Estado de vista de tarjetas
        this.cardViewMode = 'grid'; // 'grid' o 'list'
        this.versionesVisibles = 10; // Cargar más versiones en grid
        this.listCurrentPage = 1;
        this.listRowsPerPage = 10;

        // Instancia de VirtualScroll
        this.virtualScroll = new VirtualScroll({
            rowHeight: 120, // Ajustar si la altura promedio cambia
            visibleRows: 10,
            bufferRows: 5
        });

        // Filtros (sin cambios)
        this.filters = { search: '', estado: '', responsable: '', fechaDesde: '', fechaHasta: '' };
        this.detailFilters = { search: '', estado: '', responsable: '' };

        // Referencias a elementos (se buscan dinámicamente)
        this.gridContainer = null;
        this.listContainer = null;
        this.loadMoreContainer = null;
        this.viewCardsContainer = null;
    }

    /**
     * Asegura que las referencias a los contenedores principales existan.
     */
    _ensureContainers() {
        const currentViewCardsContainer = document.getElementById('view-cards');

        if (!currentViewCardsContainer) {
            console.error("Error Crítico: No se encontró #view-cards.");
            // Resetear todo si el padre no existe
            this.viewCardsContainer = null; this.gridContainer = null; this.listContainer = null; this.loadMoreContainer = null;
            return false;
        }

        // Rebuscar si el padre cambió o algún hijo es null
        if (this.viewCardsContainer !== currentViewCardsContainer || !this.gridContainer || !this.listContainer || !this.loadMoreContainer) {
            this.viewCardsContainer = currentViewCardsContainer;
            console.log("🔍 Buscando/Refrescando contenedores hijos...");

            this.gridContainer = this.viewCardsContainer.querySelector('#versions-grid');
            this.listContainer = this.viewCardsContainer.querySelector('#versions-list-container'); // Busca el div padre de la lista
            this.loadMoreContainer = this.viewCardsContainer.querySelector('#load-more-container');

            if (!this.gridContainer || !this.listContainer || !this.loadMoreContainer) {
                console.error("Error Crítico: Faltan #versions-grid, #versions-list-container o #load-more-container dentro de #view-cards.");
                this.gridContainer = null; this.listContainer = null; this.loadMoreContainer = null; // Resetear hijos
                return false;
            }
             // Asegurar que exista el div interno #versions-list donde va la tabla
            if (!this.listContainer.querySelector('#versions-list')) {
                 console.error("Error Crítico: Falta el div #versions-list dentro de #versions-list-container.");
                 this.listContainer = null; // Invalidar contenedor padre si falta el hijo
                 return false;
            }
            // Asegurar que exista el div para paginación
             if (!this.listContainer.querySelector('#list-pagination')) {
                  console.error("Error Crítico: Falta el div #list-pagination dentro de #versions-list-container.");
                  this.listContainer = null; // Invalidar
                  return false;
             }

            console.log("✅ Contenedores hijos encontrados.");
        }
        return true;
    }

    // --- Métodos de cambio de vista (showCardsView, showDetailView - sin cambios) ---
    showCardsView() {
        document.getElementById('view-cards')?.classList.add('active');
        document.getElementById('view-detail')?.classList.remove('active');
        this.currentView = 'cards';
        this.currentVersionId = null;
        // Resetear contadores de vista de tarjetas al volver
        this.versionesVisibles = 10;
        this.listCurrentPage = 1;
        this.renderCardsView(); // Llama al router
    }

    showDetailView(versionId) {
        document.getElementById('view-cards')?.classList.remove('active');
        document.getElementById('view-detail')?.classList.add('active');
        this.currentView = 'detail';
        this.currentVersionId = versionId;
        this.renderDetailView(versionId); // Renderiza detalle
    }


    // --- Métodos de filtros (applyFilters, getResponsablesText - sin cambios) ---
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
             // Asegurar que version.cdus sea un array
            const cdus = Array.isArray(version.cdus) ? version.cdus : [];

            const filteredCdus = cdus.filter(cdu => {
                // Filtro búsqueda general
                if (this.filters.search) {
                    const searchLower = this.filters.search.toLowerCase();
                    const versionNumMatch = version.numero?.toLowerCase().includes(searchLower); // Chequear si numero existe
                    const cduNameMatch = cdu.nombreCDU?.toLowerCase().includes(searchLower); // Chequear si nombreCDU existe
                    const cduDescMatch = cdu.descripcionCDU?.toLowerCase().includes(searchLower); // Chequear si descripcionCDU existe
                    const respMatch = this.getResponsablesText(cdu).toLowerCase().includes(searchLower);

                    if (!versionNumMatch && !cduNameMatch && !cduDescMatch && !respMatch) return false;
                }

                // Filtro estado
                if (this.filters.estado && cdu.estado !== this.filters.estado) {
                    return false;
                }

                // Filtro responsable
                if (this.filters.responsable) {
                    const responsableLower = this.filters.responsable.toLowerCase();
                    if (!this.getResponsablesText(cdu).toLowerCase().includes(responsableLower)) {
                        return false;
                    }
                }
                // Filtro fechaDesde (comparar fechas como strings YYYY-MM-DD funciona)
                 if (this.filters.fechaDesde && version.fechaDespliegue && version.fechaDespliegue < this.filters.fechaDesde) {
                    return false;
                 }
                 // Filtro fechaHasta
                 if (this.filters.fechaHasta && version.fechaDespliegue && version.fechaDespliegue > this.filters.fechaHasta) {
                    return false;
                 }


                return true; // Pasa todos los filtros aplicados
            });

            // Mantener la versión si el número coincide O si tiene CDUs filtrados
            const versionNumberMatches = this.filters.search && version.numero?.toLowerCase().includes(this.filters.search.toLowerCase());
            return {
                ...version,
                cdus: filteredCdus,
                _keepVersion: versionNumberMatches
            };
        }).filter(version => version.cdus.length > 0 || version._keepVersion);

        // Limpiar bandera temporal
        filtered.forEach(v => delete v._keepVersion);

        return filtered;
    }

     getResponsablesText(cdu) {
        if (!cdu) return '';
        if (Array.isArray(cdu.responsables) && cdu.responsables.length > 0) {
            return cdu.responsables.map(r => `${r.nombre || ''} ${r.rol || ''}`).join(' ');
        } else if (cdu.responsable) { // Compatibilidad
            return cdu.responsable;
        }
        return '';
    }

    /**
     * Actualiza las estadísticas mostradas en la sección de filtros.
     */
    updateFilterStats(filteredVersions, totalVersions) {
        // Asegurar que los elementos existan
         const showingEl = document.getElementById('filter-showing');
         const totalEl = document.getElementById('filter-total');
         const versionsEl = document.getElementById('filter-versions');

         if (!showingEl || !totalEl || !versionsEl) {
              console.warn("Elementos de estadísticas de filtro no encontrados.");
              return;
         }


        // Calcular CDUs totales (de todas las versiones, no solo las filtradas)
        const totalCdusAll = totalVersions.reduce((sum, v) => sum + (Array.isArray(v.cdus) ? v.cdus.length : 0), 0);
        // Calcular CDUs mostrados (de las versiones filtradas)
        const showingCdusFiltered = filteredVersions.reduce((sum, v) => sum + (Array.isArray(v.cdus) ? v.cdus.length : 0), 0);

        showingEl.textContent = showingCdusFiltered;
        totalEl.textContent = totalCdusAll; // Mostrar total de TODOS los CDUs
        versionsEl.textContent = filteredVersions.length; // Mostrar número de versiones que coinciden
    }


    /**
     * Router para la vista de tarjetas. Llama a _ensureContainers.
     */
    renderCardsView() {
        if (!this._ensureContainers()) {
            console.error("Renderizado de vista de tarjetas abortado.");
            // Mostrar error en UI si es posible
             if (this.viewCardsContainer) {
                 this.viewCardsContainer.innerHTML = '<p class="error-message">Error al cargar la interfaz. Recargue la página.</p>';
             }
            return;
        }

        // Renderizar según el modo (grid o list)
        if (this.cardViewMode === 'grid') {
            this.renderCardsGrid();
        } else {
            this.renderCardsList();
        }
         // Actualizar estado de los botones de toggle de vista
         this.updateViewToggleButtons();
    }

    /**
     * Actualiza la clase 'active' en los botones de toggle Grid/List.
     */
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


    /**
     * Renderiza la vista de grid (tarjetas). Usa this.gridContainer.
     */
    renderCardsGrid() {
        // Asegurar contenedores (ya hecho por renderCardsView, pero por si acaso)
        if (!this._ensureContainers()) return;

        this.gridContainer.style.display = 'grid';
        this.listContainer.style.display = 'none'; // Ocultar lista
        this.loadMoreContainer.style.display = 'flex'; // Mostrar botón cargar más (se ajustará después)


        const allVersions = this.dataStore.getAll();
        const filteredVersions = this.applyFilters(allVersions);
        this.updateFilterStats(filteredVersions, allVersions); // Actualizar stats de filtros

        this.gridContainer.innerHTML = ''; // Limpiar grid

        if (filteredVersions.length === 0) {
            this.showNoVersionsMessage(this.gridContainer);
            this.updateLoadMoreButton(0, 0); // Ocultar botón
            return;
        }

        // Ordenar por número de versión descendente
        const sortedVersions = [...filteredVersions].sort((a, b) => {
            const numA = parseInt(a.numero) || 0;
            const numB = parseInt(b.numero) || 0;
            return numB - numA;
        });

        const versionEnProduccionId = this.dataStore.getVersionEnProduccionId();
        // Mostrar solo las 'versionesVisibles'
        const versionesToShow = sortedVersions.slice(0, this.versionesVisibles);

        console.log(`🎨 RENDER GRID - Mostrando ${versionesToShow.length} de ${sortedVersions.length} versiones filtradas.`);

        const fragment = document.createDocumentFragment(); // Usar fragmento para mejor performance
        versionesToShow.forEach(version => {
            const isEnProduccion = version.id === versionEnProduccionId;
            const card = DOMBuilder.crearTarjetaVersion(version, (vId) => {
                this.showDetailView(vId);
            }, isEnProduccion);
            fragment.appendChild(card);
        });
        this.gridContainer.appendChild(fragment); // Añadir todas las tarjetas a la vez

        // Actualizar el botón "Cargar Más"
        this.updateLoadMoreButton(versionesToShow.length, sortedVersions.length);
    }

    /**
     * Renderiza la vista de lista paginada. Usa this.listContainer.
     */
    renderCardsList() {
        if (!this._ensureContainers()) return;

        this.gridContainer.style.display = 'none'; // Ocultar grid
        this.listContainer.style.display = 'block'; // Mostrar contenedor de lista
        this.loadMoreContainer.style.display = 'none'; // Ocultar cargar más

        const allVersions = this.dataStore.getAll();
        const filteredVersions = this.applyFilters(allVersions);
        this.updateFilterStats(filteredVersions, allVersions); // Actualizar stats de filtros

        const listDiv = this.listContainer.querySelector('#versions-list'); // Div interno para la tabla
        if (!listDiv) {
             console.error("Error: No se encontró #versions-list dentro de #versions-list-container");
             return;
        }
        listDiv.innerHTML = ''; // Limpiar contenido anterior (tabla)

        if (filteredVersions.length === 0) {
             this.showNoVersionsMessage(listDiv); // Mostrar mensaje dentro del div
             this.renderListPagination(0, 1); // Limpiar paginación
             return;
        }

        // Ordenar por número descendente
        const sortedVersions = [...filteredVersions].sort((a, b) => {
             const numA = parseInt(a.numero) || 0;
             const numB = parseInt(b.numero) || 0;
             return numB - numA;
        });


        const totalVersions = sortedVersions.length;
        const totalPages = Math.ceil(totalVersions / this.listRowsPerPage);
        // Asegurar que la página actual sea válida
        this.listCurrentPage = Math.max(1, Math.min(this.listCurrentPage, totalPages || 1));


        const startIndex = (this.listCurrentPage - 1) * this.listRowsPerPage;
        const endIndex = Math.min(startIndex + this.listRowsPerPage, totalVersions);
        const versionsToShow = sortedVersions.slice(startIndex, endIndex);

        console.log(`🎨 RENDER LIST - Página ${this.listCurrentPage}/${totalPages}. Mostrando [${startIndex}-${endIndex}] de ${totalVersions}`);

        const table = document.createElement('table');
        table.className = 'versions-list-table';
        // Encabezados corregidos
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

        const fragment = document.createDocumentFragment(); // Usar fragmento
        versionsToShow.forEach(version => {
            const isEnProduccion = version.id === versionEnProduccionId;
            const row = DOMBuilder.crearFilaVersionLista(version, isEnProduccion, (vId) => {
                this.showDetailView(vId);
            });
            fragment.appendChild(row);
        });
        tbody.appendChild(fragment); // Añadir filas al tbody
        table.appendChild(tbody); // Añadir tbody a la tabla
        listDiv.appendChild(table); // Añadir tabla al div

        // Renderizar paginación
        this.renderListPagination(totalPages, this.listCurrentPage);
    }

    /**
     * Renderiza los botones de paginación.
     */
    renderListPagination(totalPages, currentPage) {
        if (!this.listContainer) return; // Necesario por si _ensureContainers falla antes

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

        // Botón "Anterior"
        paginationContainer.appendChild(createButton('&laquo; Anterior', currentPage - 1, currentPage === 1));

        // Números de página con lógica "..."
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        // "1 ..."
        if (startPage > 1) {
            paginationContainer.appendChild(createButton('1', 1));
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.padding = '0.5rem';
                paginationContainer.appendChild(ellipsis);
            }
        }

        // Páginas centrales
        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createButton(String(i), i, false, i === currentPage));
        }

        // "... Ultima"
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.padding = '0.5rem';
                paginationContainer.appendChild(ellipsis);
            }
            paginationContainer.appendChild(createButton(String(totalPages), totalPages));
        }

        // Botón "Siguiente"
        paginationContainer.appendChild(createButton('Siguiente &raquo;', currentPage + 1, currentPage === totalPages));
    }


    /**
     * Cambia de página en la vista de lista.
     */
    changeListPage(newPage) {
        if (!this._ensureContainers()) return;

        const allVersions = this.dataStore.getAll();
        const filteredVersions = this.applyFilters(allVersions);
        const totalPages = Math.ceil(filteredVersions.length / this.listRowsPerPage);

        const targetPage = Math.max(1, Math.min(newPage, totalPages || 1)); // Asegurar validez

        if (targetPage !== this.listCurrentPage) {
             this.listCurrentPage = targetPage;
             this.renderCardsList(); // Re-renderizar
        }
    }

    /**
     * Actualiza el botón "Cargar Más".
     */
    updateLoadMoreButton(showing, total) {
        if (!this.loadMoreContainer) return; // Comprobación

        const btnLoadMore = this.loadMoreContainer.querySelector('#btn-load-more-versions');
        const countSpan = this.loadMoreContainer.querySelector('#versions-remaining-count');

        if (!btnLoadMore || !countSpan) {
            this.loadMoreContainer.style.display = 'none';
            return;
        }

        const remaining = total - showing;

        if (remaining > 0) {
            // Asegurarse que esté visible (ya lo hacemos en renderCardsGrid)
            // this.loadMoreContainer.style.display = 'flex';
            countSpan.textContent = remaining;
        } else {
            this.loadMoreContainer.style.display = 'none'; // Ocultar si no quedan
        }
    }


    /**
     * Carga más versiones en la vista de grid.
     */
    cargarMasVersiones() {
        this.versionesVisibles += 10; // Incrementar número
        this.renderCardsView(); // Re-renderizar (llamará a grid si está activo)
    }

    /**
     * Muestra mensaje cuando no hay versiones.
     */
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
        message.style.gridColumn = '1 / -1'; // Para grid
        message.style.textAlign = 'center';
        message.style.padding = '4rem 2rem';
        container.innerHTML = ''; // Limpiar antes de añadir
        container.appendChild(message);
    }

    /**
     * Renderiza la vista de detalle de una versión.
     */
    renderDetailView(versionId) {
        const version = this.dataStore.getAll().find(v => v.id === versionId);

        if (!version) {
            console.warn(`Intento de renderizar detalle para versión ID ${versionId} no encontrada.`);
            this.showCardsView();
            return;
        }

        // --- Actualizar campos de metadata ---
        document.getElementById('detail-version-title').textContent = `Versión ${version.numero}`;
        document.getElementById('detail-version-creation-date').value = version.fechaCreacion || '';
        document.getElementById('detail-version-source').value = version.fuente || '';
        document.getElementById('detail-version-date').value = version.fechaDespliegue || '';
        document.getElementById('detail-version-time').value = version.horaDespliegue || '';

        // Badge "EN PRODUCCIÓN"
        const versionEnProduccionId = this.dataStore.getVersionEnProduccionId();
        const titleElement = document.getElementById('detail-version-title');
        const badgeHTML = `<span class="badge-produccion-inline">EN PRODUCCIÓN</span>`;
        // Eliminar badge existente antes de añadir (si aplica)
        const existingBadge = titleElement.querySelector('.badge-produccion-inline');
        if (existingBadge) existingBadge.remove();
        // Añadir badge si es la versión en producción
        if (version.id === versionEnProduccionId) {
             titleElement.innerHTML += ` ${badgeHTML}`; // Añadir con espacio
        }

        // Mostrar comentarios
        this.updateVersionComments(version);

        console.log('🎨 RENDER DETAIL - Versión:', version.numero);
        console.log('  Total CDUs en version:', version.cdus?.length || 0);

        const tbody = document.getElementById('tabla-body');
        if (!tbody) {
             console.error("Error crítico: No se encontró tbody #tabla-body.");
             return;
        }

        const cdus = Array.isArray(version.cdus) ? version.cdus : []; // Asegurar array

        if (cdus.length === 0) {
            tbody.innerHTML = '';
            this.virtualScroll.cleanup();
            this.showNoCdusMessage(tbody);
            document.getElementById('detail-filter-showing').textContent = '0';
            document.getElementById('detail-filter-total').textContent = '0';
            return;
        }

        // Aplicar filtros de detalle
        const cdusToRender = this.applyDetailFiltersInternal(cdus);

        // Renderizar con VirtualScroll
        this.virtualScroll.render(cdusToRender); // Pasar CDUs (filtrados o todos)

        // Actualizar stats de filtros de detalle
        document.getElementById('detail-filter-showing').textContent = cdusToRender.length;
        document.getElementById('detail-filter-total').textContent = cdus.length; // Total de la versión

        // Ajustar textareas
        requestAnimationFrame(() => {
            this.adjustTextareasInTbody(tbody);
        });
    }

    /**
     * Función interna para aplicar filtros de detalle.
     */
     applyDetailFiltersInternal(cdus) {
        if (!Array.isArray(cdus)) return []; // Seguridad

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

    /**
     * Aplica los filtros de detalle y actualiza la tabla.
     */
   applyDetailFilters() {
       if (this.currentView !== 'detail' || !this.currentVersionId) return;

       const version = this.dataStore.getAll().find(v => v.id === this.currentVersionId);
       const cdus = (version && Array.isArray(version.cdus)) ? version.cdus : []; // Asegurar array

       // Aplicar filtros
       const filteredCdus = this.applyDetailFiltersInternal(cdus);

       // Actualizar VirtualScroll
       this.virtualScroll.updateData(filteredCdus); // Usar updateData para mantener scroll

       // Actualizar estadísticas
       const showingEl = document.getElementById('detail-filter-showing');
       const totalEl = document.getElementById('detail-filter-total');
       if(showingEl) showingEl.textContent = filteredCdus.length;
       if(totalEl) totalEl.textContent = cdus.length; // Total de la versión actual

       // Ajustar textareas (importante después de updateData)
        requestAnimationFrame(() => {
             const tbody = document.getElementById('tabla-body');
             if (tbody) this.adjustTextareasInTbody(tbody);
        });
   }

    /**
     * Ajusta la altura de los textareas dentro de un tbody.
     */
    adjustTextareasInTbody(tbody) {
        if (!tbody) return;
        tbody.querySelectorAll('.campo-descripcion').forEach(textarea => {
             // Solo ajustar si la fila es visible (no es parte de los spacers)
            if (textarea.closest('tr') && !textarea.closest('tr').classList.contains('virtual-scroll-spacer')) {
                textarea.style.height = 'auto'; // Resetear
                // Añadir un pequeño extra para evitar scrollbar innecesario a veces
                textarea.style.height = `${textarea.scrollHeight + 2}px`;
            }
        });
    }


    /**
     * Actualiza la sección de comentarios en la vista de detalle.
     */
    updateVersionComments(version = null) {
        // ... (lógica interna sin cambios, solo asegurar que los elementos existan) ...
        if (this.currentView !== 'detail' || !this.currentVersionId) return;

        const versionToUse = version || this.dataStore.getAll().find(v => v.id === this.currentVersionId);
        if (!versionToUse) return;

        const commentsDisplay = document.getElementById('version-comments-display');
        const commentsContainer = document.getElementById('version-comments-container');
        if (!commentsDisplay || !commentsContainer) {
             console.warn("Elementos de comentarios no encontrados.");
             return; // Salir si no se encuentran los divs
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

    /** Verifica si hay comentarios significativos */
    tieneComentarios(comentarios) {
        if (!comentarios) return false;
        if (typeof comentarios === 'string') return comentarios.trim().length > 0;
        // Verificar si algún array de categoría tiene elementos
        return Object.values(comentarios).some(arr => Array.isArray(arr) && arr.length > 0);
    }

    /** Renderiza comentarios categorizados */
    renderComentariosCategorizados(comentarios) {
         let comentariosObj = comentarios;
         if (typeof comentarios === 'string') {
             comentariosObj = { mejoras: [], salidas: [], cambiosCaliente: [], observaciones: [comentarios] };
         } else if (!comentarios || typeof comentarios !== 'object') { // Validar que sea objeto
              comentariosObj = { mejoras: [], salidas: [], cambiosCaliente: [], observaciones: [] };
         } else {
              // Asegurar que todas las categorías existan como arrays
              comentariosObj = {
                   mejoras: Array.isArray(comentarios.mejoras) ? comentarios.mejoras : [],
                   salidas: Array.isArray(comentarios.salidas) ? comentarios.salidas : [],
                   cambiosCaliente: Array.isArray(comentarios.cambiosCaliente) ? comentarios.cambiosCaliente : [],
                   observaciones: Array.isArray(comentarios.observaciones) ? comentarios.observaciones : []
              };
         }


        let html = '';
        // Definir iconos SVG directamente aquí para simplicidad
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
             const items = comentariosObj[cat.key]; // Usar objeto normalizado
             // Filtrar items vacíos o nulos ANTES de renderizar
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

    /** Muestra mensaje si no hay CDUs en detalle */
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

    /** Formatea fecha YYYY-MM-DD a DD/MM/YYYY */
    formatDate(dateString) {
        // ... (igual que en VersionCard y VersionListRow) ...
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

    // --- Métodos de manejo de filtros (setFilters, clearFilters, setDetailFilters, clearDetailFilters - sin cambios) ---
    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
        if (this.currentView === 'cards') {
            this.listCurrentPage = 1; // Resetear paginación
            this.versionesVisibles = 10; // Resetear carga grid
            this.renderCardsView();
        }
    }

    clearFilters() {
        this.filters = { search: '', estado: '', responsable: '', fechaDesde: '', fechaHasta: '' };
        // Limpiar inputs DOM
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
            this.applyDetailFilters(); // Llama a la función que actualiza virtual scroll
        }
    }

    clearDetailFilters() {
        this.detailFilters = { search: '', estado: '', responsable: '' };
        // Limpiar inputs DOM
        const searchInput = document.getElementById('detail-filter-search');
        const estadoSelect = document.getElementById('detail-filter-estado');
        const responsableInput = document.getElementById('detail-filter-responsable');
         if(searchInput) searchInput.value = '';
         if(estadoSelect) estadoSelect.value = '';
         if(responsableInput) responsableInput.value = '';

        if (this.currentView === 'detail' && this.currentVersionId) {
            this.applyDetailFilters(); // Llama a la función que actualiza virtual scroll
        }
    }


    /**
     * Actualiza las estadísticas (solo log por ahora).
     */
    updateStats() {
        console.log('📊 Actualización de stats (solo consola)');
        // La lógica para actualizar la UI fue eliminada
    }

    /**
     * Inicializa el renderer.
     */
    init() {
        // Asegurar contenedores y renderizar vista inicial
        this.showCardsView(); // Llama a _ensureContainers y renderiza
        // this.updateStats(); // Ya no actualiza UI

        // Suscribirse a cambios del DataStore
        this.dataStore.subscribe((versiones, options = {}) => {
            console.log('📬 DataStore notificado. Opciones:', options);
            // this.updateStats(); // Ya no actualiza UI

             // Re-renderizar vista de tarjetas si es necesario
            if (this.currentView === 'cards' || options.fullRender) {
                 console.log(`🔄 Re-renderizando vista de tarjetas... (fullRender: ${!!options.fullRender})`);
                 // Resetear contadores si es fullRender o cambiamos a tarjetas
                 if(options.fullRender || this.currentView !== 'cards') {
                     this.versionesVisibles = 10;
                     this.listCurrentPage = 1;
                 }
                 this.renderCardsView();
            }
             // Actualizar partes de la vista de detalle si NO es fullRender
             else if (this.currentView === 'detail' && !options.fullRender) {
                console.log('📊 Actualizando vista de detalle (sin fullRender)');
                this.updateVersionComments(); // Actualizar comentarios
                 // Podríamos añadir lógica para actualizar la tabla si cambia algo relevante
                 // pero applyDetailFilters y renderDetailView ya lo manejan
            }
        });
    }

    /**
     * Re-renderiza la vista actual completamente.
     */
    fullRender() {
        console.log('🎨 Ejecutando fullRender...');
        this.isRendering = true;

        try {
            if (this.currentView === 'cards') {
                this.cardViewMode = (this.cardViewMode === 'list') ? 'list' : 'grid'; // Asegurar modo válido
                this.listCurrentPage = 1; // Resetear paginación
                this.versionesVisibles = 10; // Resetear carga grid
                this.renderCardsView(); // Llama al router que re-renderiza
            } else if (this.currentView === 'detail' && this.currentVersionId) {
                 this.renderDetailView(this.currentVersionId); // Re-renderizar detalle
            } else {
                 console.warn("FullRender llamado en estado inesperado:", this.currentView, this.currentVersionId);
                 this.showCardsView(); // Fallback seguro
            }
            // this.updateStats(); // Ya no actualiza UI
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