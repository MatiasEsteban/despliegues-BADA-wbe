// ChangesModal.js - Modal de resumen de cambios pendientes

import { ModalBase } from './ModalBase.js';

export class ChangesModal {
    /**
     * Muestra el modal de resumen de cambios
     * @param {Array} changes - Array de cambios pendientes
     * @returns {Promise<boolean>} - true si se confirma, false si se cancela
     */
    static show(changes) {
        return new Promise((resolve) => {
            const overlay = ModalBase.createOverlay();
            const modal = ModalBase.createModal('changes-summary');
            
            const changesHTML = changes.map((change, index) => {
                return this.renderChange(change, index);
            }).join('');
            
            const iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px; display: inline-block; vertical-align: middle;">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
            </svg>`;
            
            modal.innerHTML = `
                ${ModalBase.createHeader('Confirmar Cambios', iconSvg)}
                <div class="modal-changes-summary-info">
                    Se guardarán <strong>${changes.length}</strong> cambio${changes.length !== 1 ? 's' : ''} en total
                </div>
                <div class="modal-changes-summary-content">
                    ${changesHTML}
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary modal-cancel">Cancelar</button>
                    <button class="btn btn-success modal-confirm">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Guardar Todo
                    </button>
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
     * Renderiza un cambio individual
     */
    static renderChange(change, index) {
        // Cambio de creación de CDU
        if (change.tipo === 'creacion') {
            return `
                <div class="change-item change-item-creation">
                    <div class="change-header">
                        <span class="change-number">#${index + 1}</span>
                        <span class="change-version">Versión ${change.versionNumero}</span>
                        <span class="change-type-badge">NUEVO</span>
                    </div>
                    <div class="change-details">
                        <div class="change-cdu-name">
                            <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                            <strong>CDU Nuevo Creado</strong>
                        </div>
                        <div class="change-creation-note">
                            Se creó un nuevo CDU con estado inicial: 
                            <span class="estado-new">✨ En Desarrollo</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Cambio de versión en producción
        if (change.tipo === 'version-produccion') {
            return `
                <div class="change-item change-item-produccion">
                    <div class="change-header">
                        <span class="change-number">#${index + 1}</span>
                        <span class="change-type-badge">PRODUCCIÓN</span>
                    </div>
                    <div class="change-details">
                        <div class="change-cdu-name">
                            <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                            </svg>
                            <strong>Cambio de Versión en Producción</strong>
                        </div>
                        <div class="change-estado">
                            <span class="estado-old">${change.valorAnterior}</span>
                            <svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                            <span class="estado-new">⚡ ${change.valorNuevo}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // ¡NUEVO! Manejo específico para cambios en Responsables
        if (change.tipo === 'responsable') {
            let icon = '👤';
            let content = '';
            let title = 'Responsable';

            switch (change.campo) {
                case 'responsable-agregado':
                    icon = '➕';
                    title = 'Nuevo Responsable';
                    content = `
                        <div class="change-cdu-name">
                             <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            <strong>${change.cduNombre}</strong>
                        </div>
                        <div class="change-creation-note">${change.valorNuevo}</div>
                    `;
                    break;
                case 'responsable-eliminado':
                    icon = '➖';
                    title = 'Responsable Eliminado';
                    content = `
                        <div class="change-cdu-name">
                             <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            <strong>${change.cduNombre}</strong>
                        </div>
                        <div class="change-estado">
                            <span class="estado-old">Eliminado: ${change.valorAnterior}</span>
                        </div>
                    `;
                    break;
                case 'responsable-nombre':
                case 'responsable-rol':
                    const fieldName = change.campo === 'responsable-nombre' ? 'Nombre' : 'Rol';
                    icon = change.campo === 'responsable-nombre' ? '✏️' : '🏷️';
                    title = `Cambio de ${fieldName}`;
                    content = `
                        <div class="change-cdu-name">
                             <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            <strong>${change.cduNombre}</strong>
                        </div>
                        <div class="change-estado">
                            <span>${fieldName}:&nbsp;</span>
                            <span class="estado-old">${change.valorAnterior || 'vacío'}</span>
                            <svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                            <span class="estado-new">${change.valorNuevo}</span>
                        </div>
                    `;
                    break;
                default:
                    content = `<div class="change-cdu-name">${change.cduNombre}</div><div>${change.campo}: ${change.valorNuevo}</div>`;
            }

            return `
                <div class="change-item">
                    <div class="change-header">
                        <span class="change-number">#${index + 1}</span>
                        <span class="change-version">Versión ${change.versionNumero}</span>
                        <span class="change-type-badge">${icon} ${title}</span>
                    </div>
                    <div class="change-details">
                        ${content}
                    </div>
                </div>
            `;
        }
        
        // Cambio normal
        const estadoIcon = this.getEstadoIconForSummary(change.valorNuevo);
        return `
            <div class="change-item">
                <div class="change-header">
                    <span class="change-number">#${index + 1}</span>
                    <span class="change-version">Versión ${change.versionNumero}</span>
                </div>
                <div class="change-details">
                    <div class="change-cdu-name">
                        <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <strong>${change.cduNombre}</strong>
                    </div>
                    <div class="change-estado">
                        <span class="estado-old">${change.valorAnterior || 'Sin estado'}</span>
                        <svg class="icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                        <span class="estado-new">${estadoIcon} ${change.valorNuevo}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Obtiene el icono para el resumen según el estado
     */
    static getEstadoIconForSummary(estado) {
        const icons = {
            'En Desarrollo': '🔧',
            'Pendiente de Certificacion': '⏱️',
            'Certificado OK': '✅',
            'En Produccion': '⚡'
        };
        return icons[estado] || '📌';
    }
}