// domBuilder.js - Coordinador de componentes DOM (completamente modularizado)

import { VersionCard } from './cards/VersionCard.js';
import { CduRow } from './table/CduRow.js';
import { EstadoSelect } from './estados/EstadoSelect.js';
import { VersionListRow } from './list/VersionListRow.js';

export class DOMBuilder {
    // =============== DELEGACIÓN A COMPONENTES ===============
    
    /**
     * Crea una tarjeta de versión
     * @param {Object} version - Objeto de versión
     * @param {Function} onClickCallback - Callback al hacer click
     * @param {boolean} isEnProduccion - Si está en producción
     * @returns {HTMLElement}
     */
    static crearTarjetaVersion(version, onClickCallback, isEnProduccion = false) {
        return VersionCard.create(version, onClickCallback, isEnProduccion);
    }

    /**
     * Crea una fila de CDU para la tabla
     * @param {Object} cdu - Objeto CDU
     * @returns {HTMLElement}
     */
    static crearFilaCDU(cdu) {
        return CduRow.create(cdu);
    }
    /**
     * Crea una fila de versión para la vista de lista
     * @param {Object} version - Objeto de versión
     * @param {boolean} isEnProduccion - Si está en producción
     * @param {Function} onClickCallback - Callback al hacer click
     * @returns {HTMLElement}
     */
    static crearFilaVersionLista(version, isEnProduccion, onClickCallback) {
        return VersionListRow.create(version, isEnProduccion, onClickCallback);
    }

    /**
     * Obtiene el icono SVG de un estado
     * @param {string} estado - Estado del CDU
     * @returns {string} - SVG HTML
     */
    static getEstadoIcon(estado) {
        return EstadoSelect.getEstadoIcon(estado);
    }

    /**
     * Obtiene la clase CSS de un estado
     * @param {string} estado - Estado del CDU
     * @returns {string} - Nombre de clase CSS
     */
    static getEstadoClass(estado) {
        return EstadoSelect.getEstadoClass(estado);
    }

    /**
     * Obtiene el icono SVG de un rol
     * @param {string} rol - Rol del responsable
     * @returns {string} - SVG HTML
     */
    static getRolIcon(rol) {
        return CduRow.getRolIcon(rol);
    }

    /**
     * Actualiza las estadísticas globales en el UI
     * @param {Object} stats - Objeto con las estadísticas
     */
/*     static actualizarEstadisticas(stats) {
        const elements = {
            'stat-total': stats.total,
            'stat-desarrollo': stats.desarrollo,
            'stat-pendiente': stats.pendiente,
            'stat-certificado': stats.certificado,
            'stat-produccion': stats.produccion
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    } */
}