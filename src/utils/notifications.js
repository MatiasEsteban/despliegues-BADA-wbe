// notifications.js - Sistema de notificaciones toast

export class NotificationSystem {
    static container = null;
    static activeToasts = [];
    static maxToasts = 5;
    
    /**
     * Inicializa el contenedor de notificaciones
     */
    static init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }
    
    /**
     * Muestra una notificación
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duración en ms (0 = permanente)
     * @returns {HTMLElement} El elemento toast creado
     */
    static show(message, type = 'info', duration = 3000) {
        this.init();
        
        // Limitar cantidad de toasts
        if (this.activeToasts.length >= this.maxToasts) {
            this.activeToasts[0].remove();
        }
        
        const toast = this.createToast(message, type);
        this.container.appendChild(toast);
        this.activeToasts.push(toast);
        
        // Animación de entrada
        setTimeout(() => toast.classList.add('toast-show'), 10);
        
        // Auto-cerrar si tiene duración
        if (duration > 0) {
            setTimeout(() => {
                this.hide(toast);
            }, duration);
        }
        
        return toast;
    }
    
    /**
     * Crea el elemento HTML del toast
     */
    static createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getIcon(type);
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" title="Cerrar">×</button>
        `;
        
        // Event listener para cerrar
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.hide(toast));
        
        return toast;
    }
    
    /**
     * Oculta y remueve un toast
     */
    static hide(toast) {
        toast.classList.remove('toast-show');
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            
            const index = this.activeToasts.indexOf(toast);
            if (index > -1) {
                this.activeToasts.splice(index, 1);
            }
        }, 300);
    }
    
    /**
     * Obtiene el ícono SVG según el tipo
     */
    static getIcon(type) {
        const icons = {
            success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>`,
            error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>`,
            warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>`,
            info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>`
        };
        
        return icons[type] || icons.info;
    }
    
    /**
     * Atajos para tipos comunes
     */
    static success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }
    
    static error(message, duration = 4000) {
        return this.show(message, 'error', duration);
    }
    
    static warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }
    
    static info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }
    
    /**
     * Muestra un toast de carga persistente
     * Retorna una función para cerrarlo
     */
    static loading(message = 'Cargando...') {
        const toast = this.show(message, 'info', 0);
        toast.classList.add('toast-loading');
        
        // Agregar spinner
        const icon = toast.querySelector('.toast-icon');
        icon.innerHTML = `<div class="toast-spinner"></div>`;
        
        // Retornar función para cerrar
        return () => this.hide(toast);
    }
    
    /**
     * Limpia todas las notificaciones
     */
    static clear() {
        this.activeToasts.forEach(toast => this.hide(toast));
    }
}