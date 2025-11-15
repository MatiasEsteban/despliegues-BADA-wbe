// src/io/excelExporter.js

import * as XLSX from 'xlsx';
import { NotificationSystem } from '../utils/notifications.js';

export class ExcelExporter {
    static exportar(versiones, versionEnProduccionId = null) {
        const datosExcel = [];

        console.log('📤 Exportando con versión en producción ID:', versionEnProduccionId);

        // Asegurar que versiones sea un array
        const versionesArray = Array.isArray(versiones) ? versiones : [];

        versionesArray.forEach(version => {
            // Validar estructura mínima de versión
            if (!version || typeof version !== 'object') {
                 console.warn("Saltando versión inválida en exportación:", version);
                 return;
            }

            const comentariosFormateados = this.formatearComentarios(version.comentarios);
            // Comparar IDs numéricamente
            const esProduccion = Number(version.id) === Number(versionEnProduccionId) ? 'SÍ' : 'NO';

            const versionData = {
                'Fecha Creación': this.formatDateForExcel(version.fechaCreacion),
                'Hora Creación': version.horaCreacion || '', // Incluir Hora Creación
                'Fuente': version.fuente || '',
                'Fecha Despliegue': this.formatDateForExcel(version.fechaDespliegue),
                'Hora': version.horaDespliegue || '',
                'Versión': version.numero || '',
                'En Producción': esProduccion,
                'Mejoras/Bugfixes': comentariosFormateados.mejoras,
                'Salidas a Producción': comentariosFormateados.salidas,
                'Cambios en Caliente': comentariosFormateados.cambiosCaliente,
                'Observaciones Versión': comentariosFormateados.observaciones,
            };

            const cdus = Array.isArray(version.cdus) ? version.cdus : [];

            if (cdus.length === 0) {
                datosExcel.push({
                    ...versionData,
                    'UUID': '', 'Nombre CDU': '(Sin CDUs)', 'Descripción CDU': '', 'Estado': '',
                    'Versión BADA': '', 'Version de Miró': '', 'Responsables': '',
                    'Observaciones CDU': '', 'Historial': ''
                });
            } else {
                cdus.forEach(cdu => {
                    // Validar estructura mínima de CDU
                    if (!cdu || typeof cdu !== 'object') {
                         console.warn(`Saltando CDU inválido en versión ${version.numero}:`, cdu);
                         return;
                    }

                    const responsablesTexto = Array.isArray(cdu.responsables)
                        ? cdu.responsables.map(r => `${r?.nombre || ''} (${r?.rol || 'DEV'})`).join(' || ')
                        : (cdu.responsable ? `${cdu.responsable} (DEV)` : '');

                    const observacionesTexto = Array.isArray(cdu.observaciones)
                        ? cdu.observaciones.map(obs => typeof obs === 'string' ? obs : (obs?.texto || '')).filter(Boolean).join(' || ')
                        : (cdu.observaciones ? String(cdu.observaciones) : '');

                     const historialTexto = Array.isArray(cdu.historial)
                         ? cdu.historial
                             .filter(e => e && e.timestamp)
                             .map(entry => {
                                 try {
                                     const fecha = new Date(entry.timestamp).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' });
                                     const valAnt = entry.valorAnterior ?? '';
                                     const valNue = entry.valorNuevo ?? '';
                                     return `[${fecha}] ${entry.tipo || 'cambio'}: ${valAnt} → ${valNue}`;
                                 } catch (e) { return '[Fecha inválida] Error'; }
                             }).join(' || ')
                         : '';

                    datosExcel.push({
                        ...versionData,
                        'UUID': cdu.uuid || '',
                        'Nombre CDU': cdu.nombreCDU || '',
                        'Descripción CDU': cdu.descripcionCDU || '',
                        'Estado': cdu.estado || '',
                        'Versión BADA': cdu.versionBADA || 'V1',
                        'Version de Miró': cdu.versionMiro || '',
                        'Responsables': responsablesTexto,
                        'Observaciones CDU': observacionesTexto,
                        'Historial': historialTexto
                    });
                });
            }
        });

        // Crear Libro y Hojas
        const resumen = this.generarResumen(versionesArray); // Pasar array asegurado
        const wb = XLSX.utils.book_new();

        // Hoja Resumen
        const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
        wsResumen['!cols'] = [
            { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
            { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }
        ];
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

        // Hoja Detalle
        const headerOrder = [
              'UUID', 'Fecha Creación', 'Hora Creación', 'Fuente', 'Fecha Despliegue', 'Hora',
              'Versión', 'En Producción', 'Mejoras/Bugfixes', 'Salidas a Producción',
              'Cambios en Caliente', 'Observaciones Versión', 'Nombre CDU', 'Descripción CDU',
              'Estado', 'Versión BADA', 'Version de Miró', 'Responsables',
              'Observaciones CDU', 'Historial'
        ];
        const wsDetalle = XLSX.utils.json_to_sheet(datosExcel, { header: headerOrder });
        wsDetalle['!cols'] = [
            { wch: 36 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
            { wch: 10 }, { wch: 15 }, { wch: 40 }, { wch: 40 }, { wch: 40 }, { wch: 40 },
            { wch: 25 }, { wch: 40 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 35 },
            { wch: 50 }, { wch: 60 }
        ];
        XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle Despliegues');

        // Guardar archivo
        const fecha = new Date().toISOString().split('T')[0];
        try {
             XLSX.writeFile(wb, `Despliegues_BADA_${fecha}.xlsx`);
        } catch (error) {
             console.error("Error al escribir Excel:", error);
             NotificationSystem.error('Error al generar Excel.');
        }
    }

    static formatearComentarios(comentarios) {
        const defaultFormat = { mejoras: '', salidas: '', cambiosCaliente: '', observaciones: '' };
        if (!comentarios) return defaultFormat;
        if (typeof comentarios === 'string') return { ...defaultFormat, observaciones: comentarios };
        if (typeof comentarios === 'object') {
            const formatArray = (arr) => Array.isArray(arr) ? arr.map(s => String(s ?? '').trim()).filter(Boolean).join(' || ') : '';
            return {
                mejoras: formatArray(comentarios.mejoras),
                salidas: formatArray(comentarios.salidas),
                cambiosCaliente: formatArray(comentarios.cambiosCaliente),
                observaciones: formatArray(comentarios.observaciones)
            };
        }
        return defaultFormat;
    }

    static generarResumen(versiones) {
        const resumen = [
            ['DOCUMENTACIÓN DE DESPLIEGUES EN PRODUCCIÓN'], ['Herramienta: BADA'],
            ['Fecha Generación:', new Date().toLocaleDateString('es-ES')], [], ['Resumen por Versión'],
            // Encabezados actualizados
            ['Versión', 'Fecha Despl.', 'Hora Despl.', 'Total CDUs', 'En Desarrollo', 'Pendiente Cert.', 'Certificado OK', 'En Producción', 'Fecha Creación', 'Hora Creación', 'Fuente']
        ];

        const cduUnicosGlobal = new Map();
        let totalRegistrosGeneral = 0;

        const sortedVersiones = [...versiones].sort((a, b) => (parseInt(b.numero) || 0) - (parseInt(a.numero) || 0));

        sortedVersiones.forEach(version => {
            // Validar versión antes de procesar
            if (!version || typeof version !== 'object') return;

            const cdus = Array.isArray(version.cdus) ? version.cdus : [];
            const counts = cdus.reduce((acc, c) => {
                 if(c && c.estado) acc[c.estado] = (acc[c.estado] || 0) + 1; // Contar solo si cdu y estado existen
                 return acc;
            }, {});

             totalRegistrosGeneral += cdus.length;

            cdus.forEach(cdu => {
                 // Guardar estado más reciente (gracias al sort previo de versiones)
                if (cdu && cdu.uuid && !cduUnicosGlobal.has(cdu.uuid)) {
                    cduUnicosGlobal.set(cdu.uuid, cdu.estado || 'En Desarrollo'); // Usar fallback si falta estado
                }
            });

            resumen.push([
                `V${version.numero || '?'}`,
                this.formatDateForExcel(version.fechaDespliegue),
                version.horaDespliegue || '--:--',
                cdus.length,
                counts['En Desarrollo'] || 0,
                counts['Pendiente de Certificacion'] || 0,
                counts['Certificado OK'] || 0,
                counts['En Produccion'] || 0,
                this.formatDateForExcel(version.fechaCreacion),
                version.horaCreacion || '--:--', // Hora Creación
                version.fuente || 'N/A'
            ]);
        });

        // Calcular totales únicos
        const uniqueCounts = { desarrollo: 0, pendiente: 0, certificado: 0, produccion: 0 };
        cduUnicosGlobal.forEach(estado => {
            if (estado === 'En Desarrollo') uniqueCounts.desarrollo++;
            else if (estado === 'Pendiente de Certificacion') uniqueCounts.pendiente++;
            else if (estado === 'Certificado OK') uniqueCounts.certificado++;
            else if (estado === 'En Produccion') uniqueCounts.produccion++;
        });

        // Añadir totales y notas
        resumen.push([], ['TOTALES GENERALES'], ['Total Versiones:', versiones.length],
            ['Total Registros CDUs (con duplicados):', totalRegistrosGeneral], [],
            ['ESTADO ACTUAL CDUs ÚNICOS (por UUID):'], ['Total CDUs Únicos:', cduUnicosGlobal.size],
            ['Último estado "En Desarrollo":', uniqueCounts.desarrollo],
            ['Último estado "Pendiente Certificación":', uniqueCounts.pendiente],
            ['Último estado "Certificado OK":', uniqueCounts.certificado],
            ['Último estado "En Producción":', uniqueCounts.produccion], [],
            ['Notas:'],
            ['- El estado de CDUs únicos es el más reciente encontrado.'],
            ['- La hoja "Detalle Despliegues" contiene el historial completo.'],
            ['- Comentarios: Mejoras || Salidas || Cambios Caliente || Observaciones.']
        );

        return resumen;
    }

    static formatDateForExcel(dateString) {
        if (!dateString || typeof dateString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return '';
        try {
            const parts = dateString.split('-');
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        } catch(e) { return ''; }
   }
}