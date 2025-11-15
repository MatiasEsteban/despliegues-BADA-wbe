// src/io/excelImporter.js

import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { NotificationSystem } from '../utils/notifications.js';

export class ExcelImporter {

    static async importExcel(file) {
        try {
            const json = await this.readExcelFile(file);
            const processedData = this.processExcelData(json);
            return processedData;
        } catch (error) {
            console.error('Error en ExcelImporter.importExcel:', error);
            NotificationSystem.error(`Error al importar: ${error.message}`);
            throw error;
        }
    }

    static readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = 'Detalle Despliegues';
                    let wsDetalle = workbook.Sheets[sheetName];
                    if (!wsDetalle) {
                        const possibleSheet = Object.keys(workbook.Sheets).find(name => name.toLowerCase().includes('detalle'));
                        if (possibleSheet) {
                             NotificationSystem.warning(`No se encontró '${sheetName}'. Usando '${possibleSheet}'.`);
                             wsDetalle = workbook.Sheets[possibleSheet];
                        } else {
                            throw new Error(`No se encontró la hoja '${sheetName}'.`);
                        }
                    }
                    const json = XLSX.utils.sheet_to_json(wsDetalle, { defval: "" });
                    resolve(json);
                } catch (error) { reject(new Error('No se pudo leer la hoja de detalle. Verifique formato/nombre.')); }
            };
            reader.onerror = (error) => { reject(new Error('Error al leer el archivo.')); };
            reader.readAsArrayBuffer(file);
        });
    }

    static processExcelData(json) {
        const versionesMap = new Map();
        let versionEnProduccionId = null; // Guardará el ID temporal
        let nextTempVersionId = 1;
        let finalCduIdCounter = 1;

        json.forEach((row, rowIndex) => {
             if (!row['Versión']) {
                  console.warn(`Fila ${rowIndex + 2} ignorada: falta Versión.`);
                  return;
             }
            const versionNumero = String(row['Versión'] || '').trim();
             if (!versionNumero) {
                  console.warn(`Fila ${rowIndex + 2} ignorada: Versión vacía.`);
                  return;
             }

            let version = versionesMap.get(versionNumero);

            if (!version) {
                const tempId = nextTempVersionId++;
                const fechaCreacionParsed = this.parseExcelDate(row['Fecha Creación']);
                const horaCreacionParsed = this.parseExcelTime(row['Hora Creación']); // Parsear Hora Creación
                const fechaDespliegueParsed = this.parseExcelDate(row['Fecha Despliegue']);
                const horaDespliegueParsed = this.parseExcelTime(row['Hora']);

                version = {
                    id: tempId,
                    numero: versionNumero,
                    fechaCreacion: fechaCreacionParsed || fechaDespliegueParsed || new Date().toISOString().split('T')[0], // Fallback robusto
                    horaCreacion: horaCreacionParsed || '00:00', // Nuevo, con fallback
                    fuente: String(row['Fuente'] || 'Importada').trim(),
                    fechaDespliegue: fechaDespliegueParsed || '',
                    horaDespliegue: horaDespliegueParsed || '',
                    comentarios: {
                        mejoras: this.parseExcelStringToArray(row['Mejoras/Bugfixes']),
                        salidas: this.parseExcelStringToArray(row['Salidas a Producción']),
                        cambiosCaliente: this.parseExcelStringToArray(row['Cambios en Caliente']),
                        observaciones: this.parseExcelStringToArray(row['Observaciones Versión'])
                    },
                    cdus: []
                };
                versionesMap.set(versionNumero, version);
            }

            // Detectar versión en producción (usando ID temporal)
            if (String(row['En Producción']).toUpperCase().trim() === 'SÍ' && versionEnProduccionId === null) {
                versionEnProduccionId = version.id;
            }

            // Procesar CDU
            const nombreCDU = String(row['Nombre CDU'] || '').trim();
            if (nombreCDU && nombreCDU !== '(Sin CDUs)') {
                const responsablesTexto = String(row['Responsables'] || '');
                const responsables = responsablesTexto.split('||').map(r => r.trim()).filter(Boolean).map(r => {
                    const match = r.match(/^(.*?)\s*\((.*?)\)$/);
                    return match ? { nombre: match[1].trim(), rol: match[2].trim().toUpperCase() || 'DEV' } : { nombre: r.trim(), rol: 'DEV' };
                }).filter(r => r.nombre);

                const observacionesTexto = String(row['Observaciones CDU'] || '');
                const observaciones = observacionesTexto.split('||').map(o => o.trim()).filter(Boolean);

                 const historialTexto = String(row['Historial'] || '');
                 const historial = historialTexto.split('||').map(h_str => {
                     h_str = h_str.trim();
                     if (!h_str) return null;
                     const matchCompleto = h_str.match(/^\[(.*?)\]\s*(.*?):\s*(.*?)\s*→\s*(.*)$/);
                     if (matchCompleto) {
                         return { timestamp: this.parseHistorialTimestamp(matchCompleto[1]), tipo: (matchCompleto[2].trim() || 'cambio').toLowerCase(), valorAnterior: matchCompleto[3].trim(), valorNuevo: matchCompleto[4].trim() };
                     }
                     const matchSimple = h_str.match(/^\[(.*?)\]\s*(.*)$/);
                      if(matchSimple) { return { timestamp: this.parseHistorialTimestamp(matchSimple[1]), tipo: 'info', valorAnterior: null, valorNuevo: matchSimple[2].trim() }; }
                     console.warn(`Historial no reconocido en fila ${rowIndex + 2}:`, h_str);
                     return { timestamp: new Date().toISOString(), tipo: 'import_unknown', valorAnterior: null, valorNuevo: h_str };
                 }).filter(Boolean);

                version.cdus.push({
                    id: 0, // ID se asignará al final
                    uuid: row['UUID'] || uuidv4(),
                    nombreCDU: nombreCDU,
                    descripcionCDU: String(row['Descripción CDU'] || '').trim(),
                    estado: this.normalizarEstado(String(row['Estado'] || 'En Desarrollo')),
                    versionBADA: String(row['Versión BADA'] || 'V1').trim(),
                    versionMiro: String(row['Version de Miró'] || '').trim(),
                    responsables: responsables,
                    observaciones: observaciones,
                    historial: historial
                });
            }
        });

        // Reasignar IDs secuenciales finales
        let finalVersionIdCounter = 1;
        let finalVersionEnProduccionId = null;
        const versiones = Array.from(versionesMap.values())
          .sort((a, b) => (parseInt(a.numero) || 0) - (parseInt(b.numero) || 0))
          .map(v => {
               const oldTempId = v.id;
               const newFinalId = finalVersionIdCounter++;
               if (oldTempId === versionEnProduccionId) {
                   finalVersionEnProduccionId = newFinalId;
               }
               // Reasignar IDs de CDUs dentro del mapeo de versiones
               const cdusConIdFinal = v.cdus.map(c => ({
                   ...c,
                   id: finalCduIdCounter++
               }));
               return {
                   ...v,
                   id: newFinalId,
                   cdus: cdusConIdFinal // Usar CDUs con IDs finales
               };
          });

        console.log("Datos procesados:", { versiones, finalVersionEnProduccionId });
        return {
            versiones: versiones,
            versionEnProduccionId: finalVersionEnProduccionId
        };
    }

    static normalizarEstado(estado) {
         const estadoLower = String(estado || '').toLowerCase().trim();
         switch (estadoLower) {
             case 'en desarrollo': return 'En Desarrollo';
             case 'pendiente': case 'pendiente certificacion': case 'pendiente de certificacion': return 'Pendiente de Certificacion';
             case 'certificado': case 'certificado ok': return 'Certificado OK';
             case 'en produccion': return 'En Produccion';
             default: if(estadoLower) console.warn(`Estado no reconocido '${estado}', asignando 'En Desarrollo'.`); return 'En Desarrollo';
         }
    }

    static parseExcelStringToArray(str) {
        if (!str) return [];
        return String(str).split('||').map(s => s.trim()).filter(s => s !== '');
    }

    static parseExcelDate(excelDateValue) {
        if (excelDateValue === null || excelDateValue === undefined || excelDateValue === '') return null;
        if (typeof excelDateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(excelDateValue)) {
             try { if (!isNaN(new Date(excelDateValue + 'T00:00:00Z'))) return excelDateValue; } catch (e) { }
        }
        if (typeof excelDateValue === 'number') {
             try {
                 const dateInfo = XLSX.SSF.parse_date_code(excelDateValue);
                 if (dateInfo) {
                     const { y, m, d } = dateInfo;
                     if (y >= 1900 && y < 3000 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                     }
                 }
             } catch (e) { console.warn("Error parseando num fecha Excel:", excelDateValue, e); }
        }
        if (typeof excelDateValue === 'string') {
            try { let d; let match = excelDateValue.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
                if (match) { d = new Date(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}T00:00:00Z`); if (!isNaN(d)) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`; }
                d = new Date(excelDateValue);
                 if (!isNaN(d)) { const y = d.getFullYear(); if (y >= 1900 && y < 3000) return `${y}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
            } catch(e) { }
        }
        console.warn("No se pudo parsear fecha:", excelDateValue); return null;
    }

    static parseExcelTime(excelTimeValue) {
         if (excelTimeValue === null || excelTimeValue === undefined || excelTimeValue === '') return null;
         if (typeof excelTimeValue === 'string') { const match = excelTimeValue.match(/^(\d{1,2}):(\d{2})(:(\d{2}))?/); if (match) { const h = parseInt(match[1]), m = parseInt(match[2]); if (h>=0&&h<24&&m>=0&&m<60) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; } }
         if (typeof excelTimeValue === 'number' && excelTimeValue >= 0 && excelTimeValue <= 1) { // Permitir 1 (representa 24:00 o fin del día)
              try {
                  // Ajustar manejo de 1 para que sea 23:59 o similar si es necesario, o dejarlo como 00:00 del día siguiente?
                  // Por simplicidad, tratemos 1 como ~24:00 -> 00:00? O clamp a 23:59?
                  // Usemos Math.min para evitar que exceda 24h exactas si eso causa problemas
                  const fraction = Math.min(excelTimeValue, 0.99999); // Evitar 1.0 exacto si causa problemas
                  const totalSeconds = Math.round(fraction * 86400);
                  const hours = Math.floor(totalSeconds / 3600);
                  const minutes = Math.floor((totalSeconds % 3600) / 60);
                  if (hours>=0&&hours<24&&minutes>=0&&minutes<60) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
              } catch (e) { console.warn("Error parseando num hora Excel:", excelTimeValue, e); }
          }
         console.warn("No se pudo parsear hora:", excelTimeValue); return null;
    }

    static parseHistorialTimestamp(timestampString) {
         if (!timestampString) return new Date().toISOString();
         timestampString = String(timestampString).replace(/^\[|\]$/g, '').trim();
         let date = new Date(timestampString); if (!isNaN(date) && date.getFullYear() > 1900 && date.getFullYear() < 3000) return date.toISOString();
         const parts = timestampString.split(/,|\s+/); const datePart = parts[0]; const timePart = parts[1] || '00:00:00'; let year, month, day, hours = 0, minutes = 0, seconds = 0; const dateMatch = datePart.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/); if (dateMatch) { day = parseInt(dateMatch[1]); month = parseInt(dateMatch[2]); year = parseInt(dateMatch[3]); } else { console.warn("Fecha historial no reconocida:", datePart); return new Date().toISOString(); } const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})(:(\d{2}))?/); if (timeMatch) { hours = parseInt(timeMatch[1]); minutes = parseInt(timeMatch[2]); seconds = parseInt(timeMatch[4] || '0'); }
         if (year>=1900&&year<3000&&month>=1&&month<=12&&day>=1&&day<=31&&hours>=0&&hours<24&&minutes>=0&&minutes<60&&seconds>=0&&seconds<60) { try { const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds)); if (utcDate.getUTCFullYear()===year && utcDate.getUTCMonth()===month-1 && utcDate.getUTCDate()===day) return utcDate.toISOString(); else console.warn("Fecha inválida creada:", timestampString); } catch(e) { console.error("Error creando fecha UTC:", timestampString, e); } }
         console.warn("No se pudo parsear timestamp historial:", timestampString); return new Date().toISOString();
     }
}