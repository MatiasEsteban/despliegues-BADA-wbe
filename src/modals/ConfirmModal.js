// ConfirmModal.js - Modales de confirmación y alertas simples

import { ModalBase } from './ModalBase.js';

export class ConfirmModal {
    /**
     * Muestra un modal de confirmación
     */
    static confirm(message, title = 'Confirmación') {
        return ModalBase.show({ message, title, type: 'confirm' });
    }

    /**
     * Muestra un alert informativo
     */
    static alert(message, title = 'Aviso') {
        return ModalBase.show({ message, title, type: 'info' });
    }

    /**
     * Muestra un mensaje de éxito
     */
    static success(message, title = 'Éxito') {
        return ModalBase.show({ message, title, type: 'success' });
    }

    /**
     * Muestra un mensaje de error
     */
    static error(message, title = 'Error') {
        return ModalBase.show({ message, title, type: 'error' });
    }

    /**
     * Muestra una advertencia
     */
    static warning(message, title = 'Advertencia') {
        return ModalBase.show({ message, title, type: 'warning' });
    }
}