// ModalBase.js - Clase base para todos los modals

export class ModalBase {
    /**
     * Muestra un modal genérico
     * @param {Object} options - Configuración del modal
     * @returns {Promise<boolean>} - Resolución del modal
     */
    static show(options) {
        return new Promise((resolve) => {
            const {
                title = 'Aviso',
                message = '',
                type = 'info',
                confirmText = 'Aceptar',
                cancelText = 'Cancelar'
            } = options;

            const overlay = this.createOverlay();
            const modal = this.createModal(type);
            
            const icon = this.getIcon(type);
            
            modal.innerHTML = `
                <div class="modal-icon">
                    ${icon}
                </div>
                <div class="modal-content">
                    <h3 class="modal-title">${title}</h3>
                    <p class="modal-message">${message}</p>
                </div>
                <div class="modal-actions">
                    ${type === 'confirm' ? `<button class="btn btn-secondary modal-cancel">${cancelText}</button>` : ''}
                    <button class="btn btn-primary modal-confirm">${confirmText}</button>
                </div>
            `;
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            requestAnimationFrame(() => {
                overlay.classList.add('modal-show');
            });
            
            const confirmBtn = modal.querySelector('.modal-confirm');
            const cancelBtn = modal.querySelector('.modal-cancel');
            
            const close = (result) => {
                overlay.classList.remove('modal-show');
                setTimeout(() => {
                    document.body.removeChild(overlay);
                    resolve(result);
                }, 300);
            };
            
            confirmBtn.addEventListener('click', () => close(true));
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => close(false));
            }
            
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    close(type === 'confirm' ? false : true);
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    }

    /**
     * Crea el overlay del modal
     */
    static createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        return overlay;
    }

    /**
     * Crea el contenedor del modal
     */
    static createModal(type = 'info') {
        const modal = document.createElement('div');
        modal.className = `modal modal-${type}`;
        return modal;
    }

    /**
     * Crea el header con botón de cierre
     */
    static createHeader(title, iconSvg) {
        return `
            <div class="modal-historial-header">
                <h2 class="modal-title">
                    ${iconSvg}
                    ${title}
                </h2>
                <button class="modal-close-btn" title="Cerrar">×</button>
            </div>
        `;
    }

    /**
     * Obtiene el ícono SVG según el tipo
     */
    static getIcon(type) {
        const icons = {
            info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>`,
            success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>`,
            warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>`,
            error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>`,
            confirm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>`
        };
        return icons[type] || icons.info;
    }

    /**
     * Setup estándar de botones de cierre
     */
    static setupCloseHandlers(modal, overlay, onClose) {
        const confirmBtn = modal.querySelector('.modal-confirm');
        const cancelBtn = modal.querySelector('.modal-cancel');
        const closeBtn = modal.querySelector('.modal-close-btn');
        
        const close = (result) => {
            overlay.classList.remove('modal-show');
            setTimeout(() => {
                document.body.removeChild(overlay);
                onClose(result);
            }, 300);
        };
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => close(true));
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => close(false));
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', () => close(false));
        }
        
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                close(false);
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }
}