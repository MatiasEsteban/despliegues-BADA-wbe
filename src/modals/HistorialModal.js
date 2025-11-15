// HistorialModal.js - Modal de historial de cambios de CDU

import { ModalBase } from './ModalBase.js';

export class HistorialModal {
    /**
     * Muestra el historial de cambios de un CDU
     * @param {string} cduNombre - Nombre del CDU
     * @param {Array} historial - Array de cambios
     * @returns {Promise<boolean>}
     */
    static show(cduNombre, historial) {
        return new Promise((resolve) => {
            const overlay = ModalBase.createOverlay();
            const modal = ModalBase.createModal('historial');
            
            const iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px; display: inline-block; vertical-align: middle;">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
            </svg>`;
            
            const historialHTML = this.renderHistorial(historial);
            
            modal.innerHTML = `
                ${ModalBase.createHeader('Historial de Cambios', iconSvg)}
                <div class="modal-historial-cdu">
                    <strong>CDU:</strong> ${cduNombre || 'Sin nombre'}
                </div>
                <div class="modal-historial-content">
                    ${historialHTML}
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
     * Renderiza el HTML del historial
     */
    static renderHistorial(historial) {
        if (!historial || historial.length === 0) {
            return '<div class="historial-empty">No hay cambios registrados</div>';
        }
        
        const sorted = [...historial].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        return sorted.map(entry => {
            const fecha = new Date(entry.timestamp);
            const fechaFormateada = fecha.toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const icon = this.getHistorialIcon(entry.tipo);
            const mensaje = this.getHistorialMensaje(entry);
            
            return `
                <div class="historial-entry historial-tipo-${entry.tipo}">
                    <div class="historial-icon">${icon}</div>
                    <div class="historial-details">
                        <div class="historial-timestamp">${fechaFormateada}</div>
                        <div class="historial-message">${mensaje}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Obtiene el icono para un tipo de cambio
     */
    static getHistorialIcon(tipo) {
        const icons = {
            creacion: '✨',
            estado: '🔄',
            responsable: '👤',
            nombre: '✏️',
            descripcion: '📝',
            observacion: '💬'
        };
        return icons[tipo] || '📌';
    }

    /**
     * Genera el mensaje de historial según el tipo
     */
    static getHistorialMensaje(entry) {
        switch(entry.tipo) {
            case 'creacion':
                return '<strong>CDU creado</strong>';
            case 'estado':
                return `Estado cambiado: <span class="historial-old">${entry.valorAnterior || 'Sin estado'}</span> → <span class="historial-new">${entry.valorNuevo}</span>`;
            case 'responsable':
                return `Responsable: <span class="historial-old">${entry.valorAnterior || 'Sin asignar'}</span> → <span class="historial-new">${entry.valorNuevo}</span>`;
            case 'nombre':
                return `Nombre: <span class="historial-old">${entry.valorAnterior || 'Sin nombre'}</span> → <span class="historial-new">${entry.valorNuevo}</span>`;
            case 'descripcion':
                return `Descripción actualizada`;
            case 'observacion':
                return `${entry.valorNuevo}`;
            default:
                return `Cambio en ${entry.tipo}`;
        }
    }
}