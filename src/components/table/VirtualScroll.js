// src/components/table/VirtualScroll.js - Sistema de scroll virtual ESTABILIZADO

import { DOMBuilder } from '../domBuilder.js';

export class VirtualScroll {
    constructor(config = {}) {
        this.config = {
            estimatedRowHeight: config.rowHeight || 120, 
            bufferRows: config.bufferRows || 5,
            ...config
        };
        
        this.state = {
            startIndex: 0,
            endIndex: 0,
            scrollTop: 0
        };
        
        this.scrollListener = null;
        this.currentCdus = [];
        this.tableWrapper = null;
        this.tbody = null;
        this.rowHeights = new Map();
        this.offsets = [];
        
        this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
        this.ticking = false;
    }

    handleResize(entries) {
        let changed = false;
        for (const entry of entries) {
            const row = entry.target;
            const index = parseInt(row.dataset.virtualIndex);
            
            if (!isNaN(index)) {
                const height = entry.borderBoxSize ? entry.borderBoxSize[0].blockSize : entry.contentRect.height;
                
                if (Math.abs((this.rowHeights.get(index) || this.config.estimatedRowHeight) - height) > 1) {
                    this.rowHeights.set(index, height);
                    changed = true;
                }
            }
        }

        if (changed) {
            this.updateOffsets();
            this.updateSpacers();
            this.requestRender();
        }
    }

    render(cdus, tbodyId = 'tabla-body', tableWrapperId = '.table-wrapper') {
        this.tableWrapper = document.querySelector(tableWrapperId);
        this.tbody = document.getElementById(tbodyId);
        
        if (!this.tableWrapper || !this.tbody) return;
        
        const currentScrollTop = this.tableWrapper.scrollTop;
        
        if (cdus !== this.currentCdus) {
            this.currentCdus = cdus;
            this.rowHeights.clear(); 
            this.updateOffsets();
        }
        
        if (this.scrollListener) {
            this.tableWrapper.removeEventListener('scroll', this.scrollListener);
        }
        
        this.calculateVisibleRange(currentScrollTop);
        this.renderRows();
        
        if (currentScrollTop > 0) {
             requestAnimationFrame(() => {
                if(this.tableWrapper) this.tableWrapper.scrollTop = currentScrollTop;
             });
        }
        
        this.scrollListener = () => this.requestRender();
        this.tableWrapper.addEventListener('scroll', this.scrollListener, { passive: true });
    }

    updateData(newCdus) {
        this.currentCdus = newCdus;
        this.updateOffsets();
        this.requestRender();
    }

    checkSizes() {
        if (!this.tbody) return;
        const rows = this.tbody.querySelectorAll('tr[data-virtual-index]');
        if (rows.length > 0) {
            this.updateOffsets();
            this.updateSpacers();
        }
    }

    updateOffsets() {
        this.offsets = new Array(this.currentCdus.length);
        let total = 0;
        for (let i = 0; i < this.currentCdus.length; i++) {
            this.offsets[i] = total;
            const h = this.rowHeights.get(i) || this.config.estimatedRowHeight;
            total += h;
        }
        this.totalHeight = total;
    }

    findStartIndex(scrollTop) {
        let low = 0, high = this.currentCdus.length - 1;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const offset = this.offsets[mid];
            const height = this.rowHeights.get(mid) || this.config.estimatedRowHeight;
            
            if (offset <= scrollTop && offset + height > scrollTop) {
                return mid;
            } else if (offset < scrollTop) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return Math.max(0, low - 1);
    }

    calculateVisibleRange(scrollTop) {
        const startIndex = this.findStartIndex(scrollTop);
        const startBuffer = Math.max(0, startIndex - this.config.bufferRows);
        
        const viewportHeight = this.tableWrapper.clientHeight || 600;
        let endIndex = startIndex;
        let currentHeight = 0;
        
        while (endIndex < this.currentCdus.length && currentHeight < viewportHeight) {
            currentHeight += (this.rowHeights.get(endIndex) || this.config.estimatedRowHeight);
            endIndex++;
        }
        
        const endBuffer = Math.min(this.currentCdus.length, endIndex + this.config.bufferRows);
        
        this.state.startIndex = startBuffer;
        this.state.endIndex = endBuffer;
        this.state.scrollTop = scrollTop;
    }

    renderRows() {
        if (!this.tbody) return;
        
        this.resizeObserver.disconnect();
        this.tbody.innerHTML = '';
        
        // Spacer Superior
        const topHeight = this.offsets[this.state.startIndex] || 0;
        this.tbody.appendChild(this.createSpacer('top-spacer', topHeight));
        
        // Filas
        const fragment = document.createDocumentFragment();
        const visibleItems = this.currentCdus.slice(this.state.startIndex, this.state.endIndex);
        
        visibleItems.forEach((cdu, i) => {
            const realIndex = this.state.startIndex + i;
            const row = DOMBuilder.crearFilaCDU(cdu);
            row.dataset.virtualIndex = realIndex; 
            fragment.appendChild(row);
            this.resizeObserver.observe(row);
        });
        this.tbody.appendChild(fragment);
        
        // Spacer Inferior
        const lastIndex = this.currentCdus.length - 1;
        const totalH = (lastIndex >= 0) 
            ? (this.offsets[lastIndex] + (this.rowHeights.get(lastIndex) || this.config.estimatedRowHeight)) 
            : 0;
        const renderedEndOffset = (this.offsets[this.state.endIndex] || totalH);
        const bottomHeight = Math.max(0, totalH - renderedEndOffset);
        
        this.tbody.appendChild(this.createSpacer('bottom-spacer', bottomHeight));
    }

    updateSpacers() {
        const topSpacer = document.getElementById('top-spacer');
        const bottomSpacer = document.getElementById('bottom-spacer');
        
        if(topSpacer) {
            const h = this.offsets[this.state.startIndex] || 0;
            const td = topSpacer.querySelector('td');
            if(td) td.style.height = `${h}px`;
        }
        
        if(bottomSpacer) {
            const lastIndex = this.currentCdus.length - 1;
            const totalH = (lastIndex >= 0) 
                ? (this.offsets[lastIndex] + (this.rowHeights.get(lastIndex) || this.config.estimatedRowHeight)) 
                : 0;
            const renderedEndOffset = (this.offsets[this.state.endIndex] || totalH);
            
            const td = bottomSpacer.querySelector('td');
            if(td) td.style.height = `${Math.max(0, totalH - renderedEndOffset)}px`;
        }
    }

    createSpacer(id, height) {
        const spacer = document.createElement('tr');
        spacer.className = 'virtual-scroll-spacer';
        spacer.id = id;
        // Corregido: colspan="9" para que sea válido y no rompa el layout
        spacer.innerHTML = `<td colspan="9" style="height: ${height}px; padding: 0; border: none; pointer-events: none;"></td>`;
        return spacer;
    }

    requestRender() {
        if (!this.ticking) {
            window.requestAnimationFrame(() => {
                this.handleScroll();
                this.ticking = false;
            });
            this.ticking = true;
        }
    }

    handleScroll() {
        if (!this.tableWrapper) return;
        const scrollTop = this.tableWrapper.scrollTop;
        
        const currentRowHeight = this.config.estimatedRowHeight;
        const bufferPixels = this.config.bufferRows * currentRowHeight;
        
        const topLimit = this.offsets[this.state.startIndex] + (bufferPixels * 0.5);
        const bottomLimit = (this.offsets[this.state.endIndex] || this.totalHeight) - (bufferPixels * 0.5);
        
        if (scrollTop < topLimit || (scrollTop + this.tableWrapper.clientHeight) > bottomLimit) {
             this.calculateVisibleRange(scrollTop);
             this.renderRows();
        }
    }

    cleanup() {
        if (this.scrollListener && this.tableWrapper) {
            this.tableWrapper.removeEventListener('scroll', this.scrollListener);
        }
        this.resizeObserver.disconnect();
        this.rowHeights.clear();
        this.offsets = [];
        this.currentCdus = [];
    }
}