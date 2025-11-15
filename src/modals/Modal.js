// Modal.js - Utilidad para mostrar modales genéricos (alert, confirm)

import { ModalBase } from './ModalBase.js';

export class Modal {
    /**
     * Muestra un modal de alerta
     * @param {string} message - Mensaje a mostrar
     * @param {string} title - Título del modal
     * @param {string} type - Tipo de alerta ('success', 'warning', 'error', 'info')
     * @returns {Promise<void>}
     */
    static alert(message, title = 'Alerta', type = 'info') {
        return new Promise((resolve) => {
            const overlay = ModalBase.createOverlay();
            const modal = ModalBase.createModal(type);
            
            const icon = this.getIconForType(type);
            
            modal.innerHTML = `
                ${ModalBase.createHeader(title, '')}
                <div class="modal-body-content">
                    <div class="modal-content-container">
                        <div class="modal-icon modal-${type}">${icon}</div>
        <p class="modal-message">${message}</p>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary modal-confirm">Aceptar</button>
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
     * Muestra un modal de confirmación
     * @param {string} message - Mensaje a mostrar
     * @param {string} confirmText - Texto del botón de confirmación
     * @param {string} cancelText - Texto del botón de cancelación
     * @param {string} title - Título del modal
     * @param {string} type - Tipo de alerta ('success', 'warning', 'error', 'info')
     * @returns {Promise<boolean>} - true si se confirma, false si se cancela
     */
    static confirm(message, confirmText = 'Confirmar', cancelText = 'Cancelar', title = 'Confirmación', type = 'warning') {
        return new Promise((resolve) => {
            const overlay = ModalBase.createOverlay();
            const modal = ModalBase.createModal(type);
            
            const icon = this.getIconForType(type);
            
            modal.innerHTML = `
              ${ModalBase.createHeader(title, '')}
                <div class="modal-body-content">
                    <div class="modal-content-container">
                        <div class="modal-icon modal-${type}">${icon}</div>
                        <p class="modal-message">${message}</p>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary modal-cancel">${cancelText}</button>
                    <button class="btn btn-primary modal-confirm">${confirmText}</button>
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
     * Retorna el HTML del icono según el tipo de modal
     */
static getIconForType(type) {
    // Define atributos comunes para todos los íconos
    const attrs = `width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"`;

    switch (type) {
        case 'success':
            return `<svg ${attrs}><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        case 'warning':
            return `<svg ${attrs}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        case 'error':
            return `<svg ${attrs}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        case 'info':
        default:
            return `<svg ${attrs}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }
}
}