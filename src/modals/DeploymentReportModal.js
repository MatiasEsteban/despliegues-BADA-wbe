// DeploymentReportModal.js - Modal de reporte de despliegue

import { ModalBase } from './ModalBase.js';

export class DeploymentReportModal {
    /**
     * Muestra el modal de reporte de despliegue
     * @param {Object} version - Objeto de versión completo
     * @param {boolean} isEnProduccion - Si está en producción
     * @returns {Promise<boolean>}
     */
    static show(version, isEnProduccion = false) {
        return new Promise((resolve) => {
            const overlay = ModalBase.createOverlay();
            const modal = ModalBase.createModal('deployment-report');
            
            // Formatear fecha y hora
            const fechaFormateada = this.formatearFecha(version.fechaDespliegue);
            const horaFormateada = version.horaDespliegue || '--:--';
            
            // Normalizar comentarios
            const comentarios = this.normalizeComentarios(version.comentarios);
            
            modal.innerHTML = `
                <div class="deployment-report-header-compact">
                    <div class="deployment-report-header-left">
                        <div class="deployment-report-subtitle">INFO DESPLIEGUE</div>
                        <div class="deployment-report-version-compact">
                            V${version.numero}
                            ${isEnProduccion ? '<span class="deployment-badge-produccion-compact">PROD</span>' : ''}
                        </div>
                    </div>
                    <div class="deployment-report-header-center">
                        <div class="deployment-datetime-item">
                            <svg class="icon-deployment" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span>${fechaFormateada}</span>
                        </div>
                        <span class="deployment-datetime-separator">|</span>
                        <div class="deployment-datetime-item">
                            <svg class="icon-deployment" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>${horaFormateada} hs</span>
                        </div>
                    </div>
                    <div class="deployment-report-header-right">
                        <svg class="icon-deployment" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>WhatsApp</span>
                    </div>
                    <button class="modal-close-btn" title="Cerrar">×</button>
                </div>
                
                <div class="deployment-report-body">
                    ${this.renderCategoria('mejoras', '🛠️ Mejoras y BugFix', comentarios.mejoras)}
                    ${this.renderCategoria('salidas', '⚡ A Producción', comentarios.salidas)}
                    ${this.renderCategoria('cambiosCaliente', '🔥 Cambios en Caliente', comentarios.cambiosCaliente)}
                    ${this.renderCategoria('observaciones', '📋 Observaciones', comentarios.observaciones)}
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-primary modal-confirm">Cerrar</button>
                </div>
            `;
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            requestAnimationFrame(() => {
                overlay.classList.add('modal-show');
            });
            
            ModalBase.setupCloseHandlers(modal, overlay, resolve);
        });
    }

    /**
     * Normaliza los comentarios al formato esperado
     */
    static normalizeComentarios(comentariosActuales) {
        if (typeof comentariosActuales === 'string') {
            return {
                mejoras: [],
                salidas: [],
                cambiosCaliente: [],
                observaciones: comentariosActuales ? [comentariosActuales] : []
            };
        } else if (!comentariosActuales) {
            return {
                mejoras: [],
                salidas: [],
                cambiosCaliente: [],
                observaciones: []
            };
        }
        return comentariosActuales;
    }

    /**
     * Renderiza una categoría de comentarios (solo si tiene items)
     */
    static renderCategoria(key, titulo, items) {
        // Si no hay items, NO renderizar nada
        if (!items || items.length === 0) {
            return '';
        }
        
        const itemsHTML = items.map(item => `
            <li class="deployment-report-item">
                <svg class="deployment-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>${item}</span>
            </li>
        `).join('');
        
        return `
            <div class="deployment-report-column">
                <div class="deployment-report-column-header">
                    <h3 class="deployment-report-column-title">${titulo}</h3>
                    <span class="deployment-item-count">${items.length}</span>
                </div>
                <ul class="deployment-report-column-list">
                    ${itemsHTML}
                </ul>
            </div>
        `;
    }

    /**
     * Formatea la fecha para mostrar
     */
    static formatearFecha(fechaISO) {
        if (!fechaISO) return 'Sin fecha';
        
        const fecha = new Date(fechaISO + 'T00:00:00');
        const dia = fecha.getDate().toString().padStart(2, '0');
        const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const anio = fecha.getFullYear();
        
        return `${dia}/${mes}/${anio}`;
    }
}