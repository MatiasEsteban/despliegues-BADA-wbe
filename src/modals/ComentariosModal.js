// ComentariosModal.js - Modal de comentarios de versión categorizados

import { ModalBase } from './ModalBase.js';

export class ComentariosModal {
    /**
     * Muestra el modal de comentarios de versión
     * @param {string} versionNumero - Número de versión
     * @param {Object} comentariosActuales - Comentarios actuales categorizados
     * @returns {Promise<Object|null>} - Comentarios actualizados o null si se cancela
     */
    static show(versionNumero, comentariosActuales) {
        return new Promise((resolve) => {
            const overlay = ModalBase.createOverlay();
            const modal = ModalBase.createModal('comentarios-categorized');
            
            let comentarios = this.normalizeComentarios(comentariosActuales);
            
            const iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px; display: inline-block; vertical-align: middle;">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>`;
            
            modal.innerHTML = `
                ${ModalBase.createHeader(`Comentarios de Versión ${versionNumero}`, iconSvg)}
                <div class="modal-comentarios-categorized-content">
                    ${this.renderCategoriaComentarios('mejoras', 'Mejoras y Bugfixes', comentarios.mejoras || [])}
                    ${this.renderCategoriaComentarios('salidas', 'Salidas a Producción', comentarios.salidas || [])}
                    ${this.renderCategoriaComentarios('cambiosCaliente', 'Cambios en Caliente (CeC)', comentarios.cambiosCaliente || [])}
                    ${this.renderCategoriaComentarios('observaciones', 'Observaciones', comentarios.observaciones || [])}
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary modal-cancel">Cancelar</button>
                    <button class="btn btn-primary modal-confirm">Guardar</button>
                </div>
            `;
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            requestAnimationFrame(() => {
                overlay.classList.add('modal-show');
            });
            
            this.setupComentariosEventListeners(modal);
            
            const confirmBtn = modal.querySelector('.modal-confirm');
            const cancelBtn = modal.querySelector('.modal-cancel');
            const closeBtn = modal.querySelector('.modal-close-btn');
            
            const extractComentarios = () => {
                const result = {
                    mejoras: [],
                    salidas: [],
                    cambiosCaliente: [],
                    observaciones: []
                };
                
                ['mejoras', 'salidas', 'cambiosCaliente', 'observaciones'].forEach(categoria => {
                    const container = modal.querySelector(`[data-categoria="${categoria}"]`);
                    const textareas = container.querySelectorAll('.comentario-cat-item textarea');
                    textareas.forEach(textarea => {
                        if (textarea.value.trim()) {
                            result[categoria].push(textarea.value.trim());
                        }
                    });
                });
                
                return result;
            };
            
            const close = (saveData) => {
                overlay.classList.remove('modal-show');
                setTimeout(() => {
                    document.body.removeChild(overlay);
                    resolve(saveData ? extractComentarios() : null);
                }, 300);
            };
            
            confirmBtn.addEventListener('click', () => close(true));
            cancelBtn.addEventListener('click', () => close(false));
            closeBtn.addEventListener('click', () => close(false));
            
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    close(false);
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);
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
     * Renderiza una categoría de comentarios
     */
    static renderCategoriaComentarios(categoria, titulo, items) {
        const iconos = {
            'mejoras': `<svg class="cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"></path>
                <path d="M8.5 2h7"></path>
                <path d="M7 16h10"></path>
            </svg>`,
            'salidas': `<svg class="cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>`,
            'cambiosCaliente': `<svg class="cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
            </svg>`,
            'observaciones': `<svg class="cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>`
        };
        
        const itemsHTML = items.map((item, index) => `
            <div class="comentario-cat-item" data-index="${index}">
                <textarea class="comentario-textarea" rows="2" placeholder="Escribe aquí...">${item}</textarea>
                <button class="btn-comentario-cat btn-remove" data-action="remove">×</button>
            </div>
        `).join('');
        
        return `
            <div class="comentario-categoria" data-categoria="${categoria}">
                <div class="comentario-categoria-header">
                    ${iconos[categoria]}
                    <span class="comentario-categoria-titulo">${titulo}</span>
                    <button class="btn-comentario-cat btn-add" data-action="add">+</button>
                </div>
                <div class="comentario-categoria-items">
                    ${itemsHTML || '<div class="comentario-empty">Sin elementos</div>'}
                </div>
            </div>
        `;
    }

    /**
     * Setup de event listeners para agregar/eliminar comentarios
     */
    static setupComentariosEventListeners(modal) {
        modal.addEventListener('click', (e) => {
            const btnAdd = e.target.closest('[data-action="add"]');
            if (btnAdd) {
                const categoria = btnAdd.closest('.comentario-categoria');
                const itemsContainer = categoria.querySelector('.comentario-categoria-items');
                
                const emptyMsg = itemsContainer.querySelector('.comentario-empty');
                if (emptyMsg) emptyMsg.remove();
                
                const newIndex = itemsContainer.querySelectorAll('.comentario-cat-item').length;
                const newItem = document.createElement('div');
                newItem.className = 'comentario-cat-item';
                newItem.dataset.index = newIndex;
                newItem.innerHTML = `
                    <textarea class="comentario-textarea" rows="2" placeholder="Escribe aquí..."></textarea>
                    <button class="btn-comentario-cat btn-remove" data-action="remove">×</button>
                `;
                itemsContainer.appendChild(newItem);
                
                setTimeout(() => newItem.querySelector('textarea').focus(), 50);
                return;
            }
            
            const btnRemove = e.target.closest('[data-action="remove"]');
            if (btnRemove) {
                const item = btnRemove.closest('.comentario-cat-item');
                const categoria = btnRemove.closest('.comentario-categoria');
                const itemsContainer = categoria.querySelector('.comentario-categoria-items');
                
                item.remove();
                
                if (itemsContainer.querySelectorAll('.comentario-cat-item').length === 0) {
                    itemsContainer.innerHTML = '<div class="comentario-empty">Sin elementos</div>';
                }
                return;
            }
        });
    }
}