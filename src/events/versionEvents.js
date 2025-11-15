// src/events/versionEvents.js

import { ExcelExporter } from '../io/excelExporter.js';
import { ExcelImporter } from '../io/excelImporter.js';
import { Modal } from '../modals/Modal.js';
import { Validator } from '../utils/validator.js';
import { ChangesModal } from '../modals/ChangesModal.js';
import { NotificationSystem } from '../utils/notifications.js';
import { Debouncer } from '../utils/debouncer.js';
// No importar StorageManager aquí, confiar en dataStore.notify()
// import { StorageManager } from '../core/storageManager.js';

export class VersionEvents {
    constructor(dataStore, renderer) {
        this.dataStore = dataStore;
        this.renderer = renderer;

        // Bind 'this' para los handlers que se usarán en event listeners
        this.handleInfoClick = this.handleInfoClick.bind(this);
        this.handleMarkProdClick = this.handleMarkProdClick.bind(this);
        this._handleMetaChange = this._handleMetaChange.bind(this);
        this.handleListActions = this.handleListActions.bind(this); // Bind también para lista
    }

    setup() {
        this.setupVersionMetaInputs();
        this.setupVersionButtons();
        this.setupCargarButton();
        this.setupDescargarButton();
        this.setupListActionButtons();
        console.log('✅ Eventos de versión configurados');
    }

    /** Helper centralizado para manejar cambios en metadatos y registrar cambio pendiente */
    _handleMetaChange(campo, valorNuevo) {
        if (!this.renderer.currentVersionId) {
             console.warn("_handleMetaChange llamado sin currentVersionId");
             return;
        }

        const versionActual = this.dataStore.getById(this.renderer.currentVersionId);
        if (!versionActual) {
             console.error(`Error: No se encontró la versión ${this.renderer.currentVersionId} para actualizar ${campo}`);
             return;
        }
        const valorAnterior = versionActual[campo];

        // Comparación estricta, considerar normalización si es necesario (ej. trim())
        if (valorAnterior !== valorNuevo) {
            console.log(`Intentando actualizar ${campo} de V${versionActual.numero} (ID ${this.renderer.currentVersionId}) de "${valorAnterior}" a "${valorNuevo}"`);

            // Actualizar en el dataStore (devuelve true si cambió)
            const updated = this.dataStore.updateVersion(this.renderer.currentVersionId, campo, valorNuevo);

            if (updated) {
                // Registrar cambio pendiente SOLO SI la actualización fue exitosa
                this.dataStore.addPendingChange({
                    tipo: 'metadata-version',
                    campo: campo,
                    versionId: this.renderer.currentVersionId,
                    versionNumero: versionActual.numero,
                    valorAnterior: valorAnterior,
                    valorNuevo: valorNuevo,
                    timestamp: new Date().toISOString()
                });
                console.log(` -> Cambio registrado para ${campo}: ${valorAnterior} -> ${valorNuevo}`);
            } else {
                 console.log(` -> DataStore.updateVersion no reportó cambios para ${campo}.`);
                 // NOTA: No se registra cambio pendiente si updateVersion devuelve false.
                 // Esto evita que cambios superficiales (ej. re-seleccionar la misma fecha) generen
                 // un cambio pendiente que luego no se pueda revertir correctamente.
            }
        } else {
             // console.log(` -> Sin cambios detectados para ${campo} (valor: ${valorNuevo})`);
        }
    }


    /** Configura los listeners para los inputs de metadatos en la vista detalle */
    setupVersionMetaInputs() {
        const creationDateInput = document.getElementById('detail-version-creation-date');
        if (creationDateInput) creationDateInput.addEventListener('change', (e) => { this._handleMetaChange('fechaCreacion', e.target.value); });
        else console.error("#detail-version-creation-date no encontrado");

        const creationTimeInput = document.getElementById('detail-version-creation-time');
        if (creationTimeInput) creationTimeInput.addEventListener('change', (e) => { this._handleMetaChange('horaCreacion', e.target.value); });
        else console.error("#detail-version-creation-time no encontrado");

        const sourceInput = document.getElementById('detail-version-source');
        if (sourceInput) {
            const debouncedHandler = Debouncer.debounce((event) => { this._handleMetaChange('fuente', event.target.value.trim()); }, 500);
            sourceInput.addEventListener('input', debouncedHandler);
        } else console.error("#detail-version-source no encontrado");

        const dateInput = document.getElementById('detail-version-date');
        if (dateInput) dateInput.addEventListener('change', (e) => { this._handleMetaChange('fechaDespliegue', e.target.value); });
        else console.error("#detail-version-date no encontrado");

        const timeInput = document.getElementById('detail-version-time');
        if (timeInput) timeInput.addEventListener('change', (e) => { this._handleMetaChange('horaDespliegue', e.target.value); });
        else console.error("#detail-version-time no encontrado");
    }

    /** Configura listeners para botones generales de versión */
    setupVersionButtons() {
        const btnAgregar = document.getElementById('btn-agregar');
        if(btnAgregar) {
            btnAgregar.addEventListener('click', async () => {
                if (!this.renderer.currentVersionId) return;
                const version = this.dataStore.getById(this.renderer.currentVersionId);
                if (!version) { console.error(`Agregar CDU: Versión ${this.renderer.currentVersionId} no encontrada.`); return; }

                const nuevoCdu = this.dataStore.addCduToVersion(this.renderer.currentVersionId);
                if (!nuevoCdu) return;

                 const versionActualizada = this.dataStore.getById(this.renderer.currentVersionId);
                 const cdusActualizados = versionActualizada?.cdus || [];

                if (this.renderer.virtualScroll) {
                    this.renderer.virtualScroll.updateData(cdusActualizados);
                    requestAnimationFrame(async () => {
                         const tableWrapper = document.querySelector('.table-wrapper');
                         if (tableWrapper) {
                              const newRowPosition = (cdusActualizados.length - 1) * this.renderer.virtualScroll.config.rowHeight;
                              const scrollToPosition = Math.max(0, newRowPosition - this.renderer.virtualScroll.config.rowHeight * 2);
                              tableWrapper.scrollTo({ top: scrollToPosition, behavior: 'smooth' });
                              setTimeout(() => {
                                  const newRow = tableWrapper.querySelector(`tr[data-cdu-id="${nuevoCdu.id}"]`);
                                  if (newRow) {
                                       newRow.classList.add('adding');
                                       const firstInput = newRow.querySelector('.campo-cdu');
                                       if (firstInput) firstInput.focus();
                                       setTimeout(() => newRow.classList.remove('adding'), 350);
                                  } else { console.warn("Nueva fila no encontrada para focus."); }
                              }, 500);
                         }
                    });
                }
                NotificationSystem.success('CDU creado.', 2000);
            });
        } else console.error("#btn-agregar no encontrado");

        const btnNuevaVersionLimpia = document.getElementById('btn-nueva-version-limpia');
        if (btnNuevaVersionLimpia) {
            btnNuevaVersionLimpia.addEventListener('click', async () => {
                const version = this.dataStore.addNewEmptyVersion();
                if (version) { NotificationSystem.success(`Versión ${version.numero} creada.`, 3000); this.renderer.fullRender(); }
                else { NotificationSystem.error('Error al crear versión.'); }
            });
        } else console.error("#btn-nueva-version-limpia no encontrado");

        const btnDuplicarVersion = document.getElementById('btn-duplicar-version');
        if(btnDuplicarVersion) {
            btnDuplicarVersion.addEventListener('click', async () => {
                const versiones = this.dataStore.getAll();
                if (versiones.length === 0) { NotificationSystem.warning('No hay versiones para duplicar.', 3000); return; }
                 const ultimaVersion = versiones.slice().sort((a, b) => (parseInt(b.numero) || 0) - (parseInt(a.numero) || 0))[0];
                 if (!ultimaVersion) { NotificationSystem.error('No se pudo determinar la última versión.', 3000); return; }
                const nuevaVersion = this.dataStore.duplicateVersion(ultimaVersion.id);
                if(nuevaVersion) { NotificationSystem.success(`Versión ${nuevaVersion.numero} creada como copia de V${ultimaVersion.numero}.`, 4000); this.renderer.fullRender(); }
                else { NotificationSystem.error('Error al duplicar.'); }
            });
        } else console.error("#btn-duplicar-version no encontrado");

        // Listener DELEGADO para Marcar/Desmarcar Producción (asegurando limpieza previa)
        if (this.handleMarkProdDelegate) document.removeEventListener('click', this.handleMarkProdDelegate);
        this.handleMarkProdDelegate = (e) => {
            const btnMarcar = e.target.closest('.btn-marcar-produccion');
            if (btnMarcar) {
                e.stopPropagation();
                const versionId = parseInt(btnMarcar.dataset.versionId);
                if (!isNaN(versionId)) this.handleMarkProdClick(versionId); // 'this' bindeado
                else console.warn("ID inválido en btn-marcar-produccion");
            }
        };
        document.addEventListener('click', this.handleMarkProdDelegate);

        // Listener DELEGADO para Botón Info (asegurando limpieza previa)
        if (this.handleInfoDelegate) document.removeEventListener('click', this.handleInfoDelegate);
        this.handleInfoDelegate = async (e) => {
            const btnInfo = e.target.closest('.btn-version-info');
            if (btnInfo) {
                e.stopPropagation(); e.preventDefault();
                const versionId = parseInt(btnInfo.dataset.versionId);
                 if (!isNaN(versionId)) await this.handleInfoClick(versionId); // 'this' bindeado
                else console.warn("ID inválido en btn-version-info");
            }
        };
        document.addEventListener('click', this.handleInfoDelegate);

        // Listener para Cargar Más
        const btnLoadMore = document.getElementById('btn-load-more-versions');
        if (btnLoadMore) btnLoadMore.addEventListener('click', () => { this.renderer.cargarMasVersiones(); });
    }

    /** Configura el botón y el input para cargar archivos Excel */
    setupCargarButton() {
        const btnCargar = document.getElementById('btn-cargar');
        const fileInput = document.getElementById('file-input');
        if (!btnCargar || !fileInput) { console.error("#btn-cargar o #file-input no encontrado."); return; }

        btnCargar.addEventListener('click', () => { fileInput.click(); });

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            let closeLoading = null;
            try {
                closeLoading = NotificationSystem.loading('Importando archivo Excel...');
                const resultado = await ExcelImporter.importExcel(file);
                closeLoading();

                const versiones = resultado.versiones;
                const versionEnProduccionId = resultado.versionEnProduccionId;

                if (!Array.isArray(versiones) || versiones.length === 0) {
                    NotificationSystem.error('No se encontraron datos válidos o estructura incorrecta.', 4000); return;
                }

                const uuidsUnicos = new Set();
                versiones.forEach(v => { (v.cdus || []).forEach(cdu => { if (cdu.uuid) uuidsUnicos.add(cdu.uuid); }); });
                const totalCdusUnicos = uuidsUnicos.size;

                const message = `Se encontraron:\n• ${versiones.length} versiones\n• ${totalCdusUnicos} CDUs únicos\n\n¿Desea reemplazar los datos actuales?`;
                const confirmacion = await Modal.confirm(message, 'Sí, reemplazar', 'Cancelar', 'Confirmar Importación', 'warning');

                if (confirmacion) {
                    this.dataStore.replaceAll(versiones, versionEnProduccionId);
                    this.renderer.showCardsView();
                    NotificationSystem.success(`Importación exitosa: ${versiones.length} versiones cargadas.`, 4000);
                } else { NotificationSystem.info('Importación cancelada', 2000); }
            } catch (error) {
                if(closeLoading) closeLoading();
                console.error("Error en change event de fileInput:", error);
            } finally { fileInput.value = ''; }
        });
    }

    /** Configura el botón para descargar el archivo Excel */
    setupDescargarButton() {
        const btnDescargar = document.getElementById('btn-descargar');
        if (!btnDescargar) { console.error("#btn-descargar no encontrado."); return; }

        btnDescargar.addEventListener('click', async () => {
            const versiones = this.dataStore.getAll();
            if (!Array.isArray(versiones) || versiones.length === 0) { NotificationSystem.warning('No hay datos para exportar.', 3000); return; }

            const validation = Validator.validateAllVersions(versiones);
            if (!validation.isValid) {
                const report = Validator.generateValidationReport(validation);
                const confirmacion = await Modal.confirm( `Errores de validación:\n\n${report}\n¿Descargar de todos modos?`, 'Sí, descargar', 'Cancelar', 'Advertencia', 'warning');
                if (!confirmacion) { NotificationSystem.info('Exportación cancelada.', 3000); return; }
                 NotificationSystem.warning('Exportando con errores...', 2500);
            }

            let closeLoading = null;
            try {
                closeLoading = NotificationSystem.loading('Generando archivo Excel...');
                await new Promise(resolve => setTimeout(resolve, 100));
                const versionEnProduccionId = this.dataStore.getVersionEnProduccionId();
                ExcelExporter.exportar(versiones, versionEnProduccionId);
                closeLoading();
                NotificationSystem.success('Archivo Excel generado.', 3000);
            } catch (error) {
                if (closeLoading) closeLoading();
                NotificationSystem.error('Error al generar Excel: ' + error.message, 5000);
                console.error("Error al exportar:", error);
            }
        });
    }

    /** Configura listeners para botones de acción específicos de la vista de lista */
    setupListActionButtons() {
        const listContainer = document.getElementById('versions-list-container');
        if (!listContainer) { console.error("Error: No se encontró #versions-list-container."); return; }

        // Limpiar listener anterior si existe
        if (this.handleListActions) listContainer.removeEventListener('click', this.handleListActions);

        // Usar el handler bindeado
        listContainer.addEventListener('click', this.handleListActions);
    }

    // Handler para acciones de lista (Duplicar, Eliminar)
    async handleListActions(e) {
        const duplicateBtn = e.target.closest('[data-action="duplicate-version-list"]');
        const deleteBtn = e.target.closest('[data-action="delete-version-list"]');

        if (duplicateBtn) {
            e.stopPropagation();
            const versionId = parseInt(duplicateBtn.dataset.versionId);
            if (isNaN(versionId)) return;
            const versionOriginal = this.dataStore.getById(versionId); // Ahora funciona
            if (!versionOriginal) { console.warn(`Duplicar Lista: Versión ${versionId} no encontrada.`); return; }
            try {
                const nuevaVersion = this.dataStore.duplicateVersion(versionId); // Ahora funciona
                if (nuevaVersion) {
                    NotificationSystem.success(`Versión ${nuevaVersion.numero} creada como copia de V${versionOriginal.numero}.`, 4000);
                    this.renderer.renderCardsView();
                } else { NotificationSystem.error('No se pudo duplicar.'); }
            } catch (error) { NotificationSystem.error('Error al duplicar.'); console.error(error); }

        } else if (deleteBtn) {
             e.stopPropagation();
             const versionId = parseInt(deleteBtn.dataset.versionId);
             if (isNaN(versionId)) return;
             const versionAEliminar = this.dataStore.getById(versionId); // Ahora funciona
             if (!versionAEliminar) { console.warn(`Eliminar Lista: Versión ${versionId} no encontrada.`); return; }

             const confirmacion = await Modal.confirm( `¿Eliminar Versión ${versionAEliminar.numero}?`, 'Sí, Eliminar', 'Cancelar', 'Eliminar Versión', 'error');

             if (confirmacion) {
                 try {
                     const deleted = this.dataStore.deleteVersion(versionId); // Ahora funciona
                     if (deleted) {
                         const totalPagesNow = Math.ceil(this.dataStore.getAll().length / this.renderer.listRowsPerPage);
                         if (this.renderer.listCurrentPage > totalPagesNow) {
                              this.renderer.listCurrentPage = Math.max(1, totalPagesNow);
                         }
                         this.renderer.renderCardsView();
                         NotificationSystem.success(`Versión ${versionAEliminar.numero} eliminada.`);
                     } else { NotificationSystem.error('Error al eliminar.'); }
                 } catch (error) { NotificationSystem.error('Error al actualizar vista.'); console.error(error); }
             } else { NotificationSystem.info('Eliminación cancelada.'); }
        }
    }


    /** Manejador para mostrar el modal de información de despliegue */
    async handleInfoClick(versionId) {
         console.log('🔍 Info click (handler), ID:', versionId);
         const version = this.dataStore.getById(versionId); // Ahora funciona
         if (!version) { NotificationSystem.error('Versión no encontrada.'); console.warn(`handleInfoClick: Versión ${versionId} no encontrada.`); return; }
         const versionEnProduccionId = this.dataStore.getVersionEnProduccionId();
         const isEnProduccion = Number(version.id) === Number(versionEnProduccionId);
         try {
             const { DeploymentReportModal } = await import('../modals/DeploymentReportModal.js');
             await DeploymentReportModal.show(version, isEnProduccion);
         } catch (error) { NotificationSystem.error('Error al abrir el reporte.'); console.error('Error al importar/mostrar DeploymentReportModal:', error); }
     }

    /** Manejador para marcar/desmarcar una versión como en producción */
     handleMarkProdClick(versionId) {
          const version = this.dataStore.getById(versionId); // Ahora funciona
          if(!version) { console.warn(`handleMarkProdClick: Versión ${versionId} no encontrada.`); return; }

          const versionEnProdAnteriorId = this.dataStore.getVersionEnProduccionId();
          const versionAnterior = this.dataStore.getById(versionEnProdAnteriorId); // Ahora funciona
          const nombreVersionAnterior = versionAnterior ? `V${versionAnterior.numero}` : 'Ninguna';

          // 1. Obtener estado actual
          const idActualProd = this.dataStore.getVersionEnProduccionId();
          const esLaMisma = Number(versionId) === Number(idActualProd);
          let nuevoIdProd = esLaMisma ? null : Number(versionId); // ID que DEBERÍA quedar

           // 2. Registrar cambio pendiente ANTES de aplicar temporalmente
          this.dataStore.addPendingChange({
              tipo: 'version-produccion', campo: 'version-en-produccion',
              versionId: versionId, versionNumero: version.numero,
              valorAnterior: idActualProd, // ID anterior
              valorNuevo: nuevoIdProd,     // ID nuevo (o null)
              timestamp: new Date().toISOString()
          });

           // 3. Aplicar cambio temporal en VersionStore (interno, sin notificar globalmente)
           this.dataStore.versionStore.setVersionEnProduccion(versionId); // Llama al método interno que solo cambia la variable

           // 4. Notificación y re-renderizado
           const nuevaVersionEnProdPostCambio = this.dataStore.getById(this.dataStore.getVersionEnProduccionId()); // Obtener estado actualizado
           const nombreNuevaVersion = nuevaVersionEnProdPostCambio ? `V${nuevaVersionEnProdPostCambio.numero}` : 'Ninguna'; // Nombre para notificación

           if (esLaMisma) { NotificationSystem.info(`Versión ${version.numero} desmarcada (cambio pendiente).`, 2500); }
           else { NotificationSystem.success(`Versión ${version.numero} marcada EN PRODUCCIÓN (cambio pendiente).`, 3000); }

          this.renderer.renderCardsView(); // Re-renderizar UI para reflejar cambio temporal
      }


    /** Manejador para el botón flotante "Guardar Cambios" */
    async handleSaveChanges() {
        const pendingChanges = this.dataStore.getPendingChanges();
        if (pendingChanges.length === 0) { NotificationSystem.info('No hay cambios pendientes.'); return; }

        const changesInfo = pendingChanges.map(change => {
             let versionNumero = change.versionNumero;
             if (!versionNumero && change.versionId) {
                  const v = this.dataStore.getById(change.versionId); // Ahora funciona
                  versionNumero = v ? v.numero : 'Desconocida';
             }
             let cduNombre = change.cduNombre || 'N/A';
             // Podríamos añadir búsqueda de CDU si es relevante para el modal
             return { ...change, versionNumero: versionNumero || 'N/A', cduNombre };
        });

        try {
            const confirmed = await ChangesModal.show(changesInfo);
            if (confirmed) {
                // CORRECCIÓN: Llamar a applyPendingChanges que notificará y guardará
                const appliedChanges = this.dataStore.applyPendingChanges();
                NotificationSystem.success(`Guardados ${appliedChanges.length} cambio(s).`, 3000);
                // No es necesario llamar a saveState aquí, dataStore.notify lo hace.
                // this.renderer.fullRender(); // applyPendingChanges ya notifica con fullRender
            } else {
                this.dataStore.discardPendingChanges();
                NotificationSystem.info('Cambios cancelados.', 2000);
                // Re-renderizar después de descartar
                if (this.renderer.currentView === 'detail' && this.renderer.currentVersionId) {
                     this.renderer.renderDetailView(this.renderer.currentVersionId);
                } else { this.renderer.renderCardsView(); }
            }
        } catch (error) {
            console.error('Error en handleSaveChanges:', error);
            NotificationSystem.error('Error al procesar cambios: ' + (error.message || 'Error desconocido'), 5000);
        }
    }

} // Fin clase VersionEvents