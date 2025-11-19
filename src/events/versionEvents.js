// src/events/versionEvents.js

import { ExcelExporter } from '../io/excelExporter.js';
import { ExcelImporter } from '../io/excelImporter.js';
import { Modal } from '../modals/Modal.js';
import { Validator } from '../utils/validator.js';
import { ChangesModal } from '../modals/ChangesModal.js';
import { NotificationSystem } from '../utils/notifications.js';
import { Debouncer } from '../utils/debouncer.js';

export class VersionEvents {
    constructor(dataStore, renderer) {
        this.dataStore = dataStore;
        this.renderer = renderer;

        // Bind para los handlers
        this.handleInfoClick = this.handleInfoClick.bind(this);
        this.handleMarkProdClick = this.handleMarkProdClick.bind(this);
        this._handleMetaChange = this._handleMetaChange.bind(this);
        this.handleListActions = this.handleListActions.bind(this);

        // Debouncer para el campo fuente (guardado como propiedad de la instancia)
        this.debouncedSourceHandler = Debouncer.debounce((valor) => {
            this._handleMetaChange('fuente', valor.trim());
        }, 500);
    }

    setup() {
        this.setupVersionMetaInputs();
        this.setupVersionButtons();
        this.setupCargarButton();
        this.setupDescargarButton();
        this.setupListActionButtons();
        console.log('✅ Eventos de versión configurados');
    }

    /** * Helper para manejar cambios en metadatos.
     * Valida que exista una versión actual antes de intentar actualizar.
     */
    _handleMetaChange(campo, valorNuevo) {
        if (!this.renderer.currentVersionId) {
             console.warn("_handleMetaChange: Sin currentVersionId");
             return;
        }

        const versionActual = this.dataStore.getById(this.renderer.currentVersionId);
        if (!versionActual) {
             console.error(`Error: Versión ${this.renderer.currentVersionId} no encontrada.`);
             return;
        }
        
        const valorAnterior = versionActual[campo];

        if (valorAnterior !== valorNuevo) {
            console.log(`📝 Actualizando ${campo}: "${valorAnterior}" -> "${valorNuevo}"`);

            const updated = this.dataStore.updateVersion(this.renderer.currentVersionId, campo, valorNuevo);

            if (updated) {
                this.dataStore.addPendingChange({
                    tipo: 'metadata-version',
                    campo: campo,
                    versionId: this.renderer.currentVersionId,
                    versionNumero: versionActual.numero,
                    valorAnterior: valorAnterior,
                    valorNuevo: valorNuevo,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    /** * CORRECCIÓN CRÍTICA: Uso de DELEGACIÓN DE EVENTOS.
     * Escucha en el contenedor estático '#view-detail' en lugar de los inputs dinámicos.
     */
    setupVersionMetaInputs() {
        const container = document.getElementById('view-detail');
        if (!container) {
            console.error("#view-detail no encontrado para delegación de eventos.");
            return;
        }

        // Delegación para eventos 'change' (Fecha, Hora)
        container.addEventListener('change', (e) => {
            // Verificar IDs de los inputs
            switch (e.target.id) {
                case 'detail-version-creation-date':
                    this._handleMetaChange('fechaCreacion', e.target.value);
                    break;
                case 'detail-version-creation-time':
                    this._handleMetaChange('horaCreacion', e.target.value);
                    break;
                case 'detail-version-date':
                    this._handleMetaChange('fechaDespliegue', e.target.value);
                    break;
                case 'detail-version-time':
                    this._handleMetaChange('horaDespliegue', e.target.value);
                    break;
            }
        });

        // Delegación para evento 'input' (Texto Fuente - con debounce)
        container.addEventListener('input', (e) => {
            if (e.target.id === 'detail-version-source') {
                this.debouncedSourceHandler(e.target.value);
            }
        });
    }

    setupVersionButtons() {
        // Delegación para el botón "Agregar CDU" que está dentro del footer de la tabla
        const viewCards = document.getElementById('view-cards'); // Usar contenedor principal por seguridad
        if (viewCards) {
             // Si el botón está en view-cards (que parece ser el caso según HTML original)
             // O en view-detail. Revisando renderer.js, el botón #btn-agregar está en view-detail
        }
        
        const viewDetail = document.getElementById('view-detail');
        if(viewDetail) {
            viewDetail.addEventListener('click', (e) => {
                const btnAgregar = e.target.closest('#btn-agregar');
                if (btnAgregar) {
                    this.handleAddCdu();
                }
            });
        }

        const btnNuevaVersionLimpia = document.getElementById('btn-nueva-version-limpia');
        if (btnNuevaVersionLimpia) {
            btnNuevaVersionLimpia.addEventListener('click', () => {
                const version = this.dataStore.addNewEmptyVersion();
                if (version) { 
                    NotificationSystem.success(`Versión ${version.numero} creada.`); 
                } else { 
                    NotificationSystem.error('Error al crear versión.'); 
                }
            });
        }

        const btnDuplicarVersion = document.getElementById('btn-duplicar-version');
        if(btnDuplicarVersion) {
            btnDuplicarVersion.addEventListener('click', () => {
                const versiones = this.dataStore.getAll();
                if (versiones.length === 0) { NotificationSystem.warning('No hay versiones para duplicar.'); return; }
                 // Ordenar para encontrar la última
                 const ultimaVersion = versiones.slice().sort((a, b) => (parseInt(b.numero) || 0) - (parseInt(a.numero) || 0))[0];
                
                const nuevaVersion = this.dataStore.duplicateVersion(ultimaVersion.id);
                if(nuevaVersion) { 
                    NotificationSystem.success(`Versión ${nuevaVersion.numero} creada (copia de V${ultimaVersion.numero}).`); 
                } else { 
                    NotificationSystem.error('Error al duplicar.'); 
                }
            });
        }

        // Delegación global para botones de tarjetas (Marcar Prod / Info)
        document.addEventListener('click', (e) => {
            // Botón Marcar Producción
            const btnMarcar = e.target.closest('.btn-marcar-produccion');
            if (btnMarcar) {
                e.stopPropagation();
                const versionId = parseInt(btnMarcar.dataset.versionId);
                if (!isNaN(versionId)) this.handleMarkProdClick(versionId);
            }

            // Botón Info
            const btnInfo = e.target.closest('.btn-version-info');
            if (btnInfo) {
                e.stopPropagation(); 
                e.preventDefault();
                const versionId = parseInt(btnInfo.dataset.versionId);
                if (!isNaN(versionId)) this.handleInfoClick(versionId);
            }
        });

        const btnLoadMore = document.getElementById('btn-load-more-versions');
        if (btnLoadMore) btnLoadMore.addEventListener('click', () => { this.renderer.cargarMasVersiones(); });
    }

    async handleAddCdu() {
        if (!this.renderer.currentVersionId) return;
        const nuevoCdu = this.dataStore.addCduToVersion(this.renderer.currentVersionId);
        if (!nuevoCdu) return;

        // Forzar actualización del VirtualScroll
        const versionActualizada = this.dataStore.getById(this.renderer.currentVersionId);
        if (this.renderer.virtualScroll) {
            this.renderer.virtualScroll.updateData(versionActualizada.cdus);
            
            // Scroll al final
            requestAnimationFrame(() => {
                const tableWrapper = document.querySelector('.table-wrapper');
                if (tableWrapper) {
                    tableWrapper.scrollTo({ top: tableWrapper.scrollHeight, behavior: 'smooth' });
                    
                    // Intentar hacer focus (puede requerir un pequeño delay por el virtual scroll)
                    setTimeout(() => {
                        const newRow = tableWrapper.querySelector(`tr[data-cdu-id="${nuevoCdu.id}"]`);
                        if (newRow) {
                            newRow.classList.add('adding');
                            const input = newRow.querySelector('.campo-cdu');
                            if (input) input.focus();
                            setTimeout(() => newRow.classList.remove('adding'), 500);
                        }
                    }, 300);
                }
            });
        }
        NotificationSystem.success('CDU creado.', 2000);
    }

    setupCargarButton() {
        const btnCargar = document.getElementById('btn-cargar');
        const fileInput = document.getElementById('file-input');
        if (!btnCargar || !fileInput) return;

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
                    NotificationSystem.error('No se encontraron datos válidos.'); return;
                }

                const confirmacion = await Modal.confirm(
                    `Se encontraron ${versiones.length} versiones.\n¿Desea reemplazar los datos actuales?`, 
                    'Sí, reemplazar', 'Cancelar', 'Importar', 'warning'
                );

                if (confirmacion) {
                    this.dataStore.replaceAll(versiones, versionEnProduccionId);
                    this.renderer.showCardsView();
                    NotificationSystem.success('Importación exitosa.');
                }
            } catch (error) {
                if(closeLoading) closeLoading();
                console.error(error);
                NotificationSystem.error('Error al importar.');
            } finally { fileInput.value = ''; }
        });
    }

    setupDescargarButton() {
        const btnDescargar = document.getElementById('btn-descargar');
        if (!btnDescargar) return;

        btnDescargar.addEventListener('click', async () => {
            const versiones = this.dataStore.getAll();
            if (versiones.length === 0) { NotificationSystem.warning('No hay datos.'); return; }

            const validation = Validator.validateAllVersions(versiones);
            if (!validation.isValid) {
                const report = Validator.generateValidationReport(validation);
                const confirm = await Modal.confirm(`Errores de validación:\n\n${report}\n¿Exportar igual?`, 'Sí', 'Cancelar', 'Alerta', 'warning');
                if (!confirm) return;
            }

            let closeLoading = NotificationSystem.loading('Generando Excel...');
            try {
                // Pequeño delay para que se vea el loading
                await new Promise(r => setTimeout(r, 50));
                ExcelExporter.exportar(versiones, this.dataStore.getVersionEnProduccionId());
                closeLoading();
                NotificationSystem.success('Excel generado.');
            } catch (error) {
                closeLoading();
                console.error(error);
                NotificationSystem.error('Error al exportar.');
            }
        });
    }

    setupListActionButtons() {
        const listContainer = document.getElementById('versions-list-container');
        if (!listContainer) return;
        
        if (this.handleListActions) listContainer.removeEventListener('click', this.handleListActions);
        listContainer.addEventListener('click', this.handleListActions);
    }

    async handleListActions(e) {
        const duplicateBtn = e.target.closest('[data-action="duplicate-version-list"]');
        const deleteBtn = e.target.closest('[data-action="delete-version-list"]');

        if (duplicateBtn) {
            e.stopPropagation();
            const versionId = parseInt(duplicateBtn.dataset.versionId);
            if (isNaN(versionId)) return;
            this.dataStore.duplicateVersion(versionId);
            NotificationSystem.success('Versión duplicada.');

        } else if (deleteBtn) {
             e.stopPropagation();
             const versionId = parseInt(deleteBtn.dataset.versionId);
             if (isNaN(versionId)) return;
             const version = this.dataStore.getById(versionId);
             
             if (await Modal.confirm(`¿Eliminar Versión ${version?.numero}?`, 'Eliminar', 'Cancelar', 'Confirmar', 'error')) {
                 this.dataStore.deleteVersion(versionId);
                 NotificationSystem.success('Versión eliminada.');
             }
        }
    }

    async handleInfoClick(versionId) {
         const version = this.dataStore.getById(versionId);
         if (!version) return;
         const isEnProduccion = Number(version.id) === Number(this.dataStore.getVersionEnProduccionId());
         
         // Import dinámico para evitar referencias circulares si las hubiera
         const { DeploymentReportModal } = await import('../modals/DeploymentReportModal.js');
         await DeploymentReportModal.show(version, isEnProduccion);
     }

     handleMarkProdClick(versionId) {
          const version = this.dataStore.getById(versionId);
          if(!version) return;

          const idActual = this.dataStore.getVersionEnProduccionId();
          const esLaMisma = Number(versionId) === Number(idActual);
          const nuevoId = esLaMisma ? null : Number(versionId);

          this.dataStore.addPendingChange({
              tipo: 'version-produccion', 
              campo: 'version-en-produccion',
              versionId: versionId, 
              versionNumero: version.numero,
              valorAnterior: idActual,
              valorNuevo: nuevoId,
              timestamp: new Date().toISOString()
          });

           // Aplicar temporalmente para feedback visual inmediato
           this.dataStore.versionStore.setVersionEnProduccion(versionId);
           this.renderer.renderCardsView();
           
           NotificationSystem.success(esLaMisma ? 'Versión desmarcada.' : 'Versión marcada en producción (Pendiente).');
      }

    async handleSaveChanges() {
        const pending = this.dataStore.getPendingChanges();
        if (pending.length === 0) { NotificationSystem.info('No hay cambios.'); return; }

        if (await ChangesModal.show(pending)) {
            this.dataStore.applyPendingChanges();
            NotificationSystem.success('Cambios guardados.');
        } else {
            this.dataStore.discardPendingChanges();
            NotificationSystem.info('Cambios revertidos.');
        }
    }
}