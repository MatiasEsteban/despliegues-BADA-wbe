// src/modals/ProgressModal.js - Modal con gráfico de progreso total

import { ModalBase } from './ModalBase.js';

export class ProgressModal {
    /**
     * Muestra el modal de progreso
     * @param {string} versionNumero - Número de la versión
     * @param {number} progress - Porcentaje de progreso (0-100)
     */
    static show(versionNumero, progress) {
        return new Promise((resolve) => {
            const overlay = ModalBase.createOverlay();
            const modal = ModalBase.createModal('info');
            modal.classList.add('modal-progress'); // Clase específica para estilos
            
            const iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;">
                <path d="M12 20V10"></path>
                <path d="M18 20V4"></path>
                <path d="M6 20v-4"></path>
            </svg>`;
            
            // Determinar color según progreso
            let progressClass = 'progress-low';
            if (progress >= 100) progressClass = 'progress-complete';
            else if (progress >= 50) progressClass = 'progress-mid';

            modal.innerHTML = `
                ${ModalBase.createHeader(`Progreso Versión ${versionNumero}`, iconSvg)}
                <div class="modal-progress-content">
                    <div class="progress-big-text ${progressClass}">
                        ${progress}%
                    </div>
                    <div class="progress-label">Promedio Ponderado</div>
                    
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill ${progressClass}" style="width: ${progress}%"></div>
                    </div>
                    
                    <p class="progress-note">
                        Cálculo basado en el promedio de avance de los CDUs (peso igual para todos los CDUs).
                    </p>
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
}