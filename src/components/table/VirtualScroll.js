// VirtualScroll.js - Sistema de scroll virtual SIMPLIFICADO y ROBUSTO

import { DOMBuilder } from '../domBuilder.js';

export class VirtualScroll {
    constructor(config = {}) {
        this.config = {
            rowHeight: config.rowHeight || 120,
            visibleRows: config.visibleRows || 15,  // AUMENTADO
            bufferRows: config.bufferRows || 10,     // AUMENTADO significativamente
            ...config
        };
        
        this.state = {
            startIndex: 0,
            endIndex: this.config.visibleRows + (this.config.bufferRows * 2),
            scrollTop: 0,
            lastScrollTop: 0
        };
        
        this.scrollListener = null;
        this.currentCdus = [];
        this.isUpdating = false;
        this.tableWrapper = null;
        this.tbody = null;
    }

    /**
     * Renderiza CDUs con virtual scrolling
     */
    render(cdus, tbodyId = 'tabla-body', tableWrapperId = '.table-wrapper') {
        this.tableWrapper = document.querySelector(tableWrapperId);
        this.tbody = document.getElementById(tbodyId);
        
        if (!this.tableWrapper || !this.tbody) {
            console.error('❌ VirtualScroll: No se encontró tbody o tableWrapper');
            return;
        }
        
        // CRÍTICO: Preservar scroll position
        const currentScrollTop = this.tableWrapper.scrollTop;
        
        // Guardar referencia a CDUs
        this.currentCdus = cdus;
        
        // Remover listener anterior si existe
        if (this.scrollListener) {
            this.tableWrapper.removeEventListener('scroll', this.scrollListener);
        }
        
        // Si ya había scroll, calcular índices basados en posición actual
        if (currentScrollTop > 0 && cdus.length > 0) {
            const calculatedStart = Math.max(0, Math.floor(currentScrollTop / this.config.rowHeight) - this.config.bufferRows);
            this.state.startIndex = calculatedStart;
            this.state.endIndex = Math.min(
                cdus.length,
                calculatedStart + this.config.visibleRows + (this.config.bufferRows * 2)
            );
            this.state.scrollTop = currentScrollTop;
        } else {
            // Reset state solo si es primera vez
            this.state.startIndex = 0;
            this.state.endIndex = Math.min(
                this.config.visibleRows + (this.config.bufferRows * 2),
                cdus.length
            );
            this.state.scrollTop = 0;
        }
        
        // Limpiar tbody
        this.tbody.innerHTML = '';
        
        // Crear espaciador superior
        const topSpacer = this.createSpacer('top-spacer');
        this.tbody.appendChild(topSpacer);
        
        // Renderizar CDUs visibles
        this.renderVisibleRows();
        
        // Crear espaciador inferior
        const bottomSpacer = this.createSpacer('bottom-spacer');
        this.tbody.appendChild(bottomSpacer);
        
        // Actualizar espaciadores
        this.updateSpacers();
        
        // CRÍTICO: Restaurar scroll position DESPUÉS de renderizar
        if (currentScrollTop > 0) {
            requestAnimationFrame(() => {
                this.tableWrapper.scrollTop = currentScrollTop;
            });
        }
        
        // Configurar scroll listener con throttling más agresivo
        this.scrollListener = this.createScrollHandler();
        this.tableWrapper.addEventListener('scroll', this.scrollListener, { passive: true });
        
        console.log(`📜 VirtualScroll: Renderizando [${this.state.startIndex}-${this.state.endIndex}] de ${cdus.length} CDUs`);
    }

    /**
     * Renderiza las filas visibles
     */
    renderVisibleRows() {
        const fragment = document.createDocumentFragment();
        const visibleCdus = this.currentCdus.slice(this.state.startIndex, this.state.endIndex);
        
        visibleCdus.forEach(cdu => {
            const fila = DOMBuilder.crearFilaCDU(cdu);
            fragment.appendChild(fila);
        });
        
        const bottomSpacer = document.getElementById('bottom-spacer');
        if (bottomSpacer) {
            this.tbody.insertBefore(fragment, bottomSpacer);
        } else {
            this.tbody.appendChild(fragment);
        }
        
        // Ajustar textareas después de un frame
        requestAnimationFrame(() => {
            this.adjustTextareas();
        });
    }

    /**
     * Ajusta la altura de los textareas
     */
    adjustTextareas() {
        const textareas = this.tbody.querySelectorAll('.campo-descripcion');
        textareas.forEach(textarea => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        });
    }

    /**
     * Crea un elemento espaciador
     */
    createSpacer(id) {
        const spacer = document.createElement('tr');
        spacer.className = 'virtual-scroll-spacer';
        spacer.id = id;
        spacer.innerHTML = '<td colspan="7" style="height: 0; padding: 0; border: none;"></td>';
        return spacer;
    }

    /**
     * Crea el handler de scroll con throttling MÁS AGRESIVO
     */
    createScrollHandler() {
        let ticking = false;
        let lastUpdate = 0;
        const THROTTLE_MS = 100; // Throttle más agresivo
        
        return () => {
            const now = Date.now();
            
            if (!ticking && (now - lastUpdate) > THROTTLE_MS) {
                window.requestAnimationFrame(() => {
                    this.handleScroll();
                    lastUpdate = now;
                    ticking = false;
                });
                ticking = true;
            }
        };
    }

    /**
     * Maneja el evento de scroll (SIMPLIFICADO)
     */
    handleScroll() {
        if (this.isUpdating || !this.tableWrapper || !this.tbody) return;
        
        const scrollTop = this.tableWrapper.scrollTop;
        const scrollDiff = Math.abs(scrollTop - this.state.lastScrollTop);
        
        // Solo actualizar si el scroll cambió significativamente (3 filas)
        if (scrollDiff < (this.config.rowHeight * 3)) {
            return;
        }
        
        this.state.lastScrollTop = scrollTop;
        
        // Calcular nuevo rango
        const newStartIndex = Math.max(
            0,
            Math.floor(scrollTop / this.config.rowHeight) - this.config.bufferRows
        );
        const newEndIndex = Math.min(
            this.currentCdus.length,
            newStartIndex + this.config.visibleRows + (this.config.bufferRows * 2)
        );
        
        // Solo actualizar si hay cambio REAL en el rango
        if (newStartIndex === this.state.startIndex && newEndIndex === this.state.endIndex) {
            return;
        }
        
        console.log(`🔄 VirtualScroll: [${this.state.startIndex}-${this.state.endIndex}] → [${newStartIndex}-${newEndIndex}]`);
        
        this.state.startIndex = newStartIndex;
        this.state.endIndex = newEndIndex;
        this.state.scrollTop = scrollTop;
        
        // Marcar como actualizando
        this.isUpdating = true;
        
        // CRÍTICO: Guardar scroll antes de modificar DOM
        const savedScrollTop = this.tableWrapper.scrollTop;
        
        // Remover filas antiguas
        const existingRows = Array.from(this.tbody.querySelectorAll('tr:not(.virtual-scroll-spacer)'));
        existingRows.forEach(row => row.remove());
        
        // Renderizar nuevas filas
        this.renderVisibleRows();
        
        // Actualizar espaciadores
        this.updateSpacers();
        
        // CRÍTICO: Restaurar scroll inmediatamente
        this.tableWrapper.scrollTop = savedScrollTop;
        
        // Desmarcar actualizando
        setTimeout(() => {
            this.isUpdating = false;
        }, 50);
    }

    /**
     * Actualiza la altura de los espaciadores
     */
    updateSpacers() {
        const topSpacer = document.getElementById('top-spacer');
        const bottomSpacer = document.getElementById('bottom-spacer');
        
        if (!topSpacer || !bottomSpacer) return;
        
        const topHeight = this.state.startIndex * this.config.rowHeight;
        const bottomHeight = (this.currentCdus.length - this.state.endIndex) * this.config.rowHeight;
        
        topSpacer.querySelector('td').style.height = `${topHeight}px`;
        bottomSpacer.querySelector('td').style.height = `${bottomHeight}px`;
    }

    /**
     * Actualiza los datos sin perder el scroll (NUEVO)
     */
    updateData(newCdus) {
        console.log('🔄 VirtualScroll: Actualizando datos sin perder scroll');
        
        // CRÍTICO: Preservar scroll position
        const currentScrollTop = this.tableWrapper ? this.tableWrapper.scrollTop : 0;
        
        // Actualizar datos
        this.currentCdus = newCdus;
        
        // Re-renderizar filas visibles sin cambiar índices
        const existingRows = Array.from(this.tbody.querySelectorAll('tr:not(.virtual-scroll-spacer)'));
        existingRows.forEach(row => row.remove());
        
        this.renderVisibleRows();
        this.updateSpacers();
        
        // Restaurar scroll
        if (this.tableWrapper && currentScrollTop > 0) {
            requestAnimationFrame(() => {
                this.tableWrapper.scrollTop = currentScrollTop;
            });
        }
    }

    /**
     * Limpia el listener de scroll
     */
    cleanup() {
        if (this.scrollListener && this.tableWrapper) {
            this.tableWrapper.removeEventListener('scroll', this.scrollListener);
            this.scrollListener = null;
        }
        this.currentCdus = [];
        this.tableWrapper = null;
        this.tbody = null;
    }

    /**
     * Obtiene el estado actual
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Resetea el scroll a la posición inicial
     */
    reset() {
        this.state.startIndex = 0;
        this.state.endIndex = this.config.visibleRows + (this.config.bufferRows * 2);
        this.state.scrollTop = 0;
        this.state.lastScrollTop = 0;
        
        if (this.tableWrapper) {
            this.tableWrapper.scrollTop = 0;
        }
    }
}