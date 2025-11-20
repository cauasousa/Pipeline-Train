(function (global) {
    const PAGES = {
        treinamento: 'treinamento.html',
        predicao: 'predicao.html',
        metricas: 'metricas.html',
        historico: 'historico_predicao.html',
        configuracao: 'configuracao.html'
    };

    const cache = {};

    function toggleSidebar() {
        document.getElementById('sidebar')?.classList.toggle('collapsed');
        document.getElementById('main-content')?.classList.toggle('collapsed');
    }

    function navigate(page) {
        document.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('active'));
        const active = document.querySelector(`.menu-item[data-page="${page}"]`);
        if (active) active.classList.add('active');
        loadPage(page);
    }

    // NOVO CÓDIGO para ui.js:

    async function loadPage(page) {
        const view = document.getElementById('view');
        const tpl = PAGES[page]; // tpl será 'treinamento.html'
        if (!tpl) { if (view) view.innerHTML = '<p>Página não encontrada.</p>'; return; }
        if (cache[tpl]) { if (view) view.innerHTML = cache[tpl]; bindPageHandlers(page); return; }
        try {
            // use absolute URL to request the template from the server
            const url = new URL(tpl, window.location.origin + '/').href;
            console.debug('[UI] fetching view', url);
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) {
                const body = await res.text().catch(() => '');
                const msg = `Falha ao carregar '${tpl}': status=${res.status} ${res.statusText}` + (body ? `\n${body}` : '');
                console.error(msg);
                if (view) view.innerHTML = `<div class="card"><p>${msg.replace(/</g, '&lt;')}</p></div>`;
                return;
            }
            const html = await res.text();
            cache[tpl] = html;
            if (view) view.innerHTML = html;
            bindPageHandlers(page);
        } catch (e) {
            console.error('[UI] erro carregando template', tpl, e);
            if (view) view.innerHTML = `<div class="card"><p>Erro carregando página (${tpl}): ${String(e).replace(/</g, '&lt;')}</p></div>`;
        }
    }

    function showLog(msg) {
        const area = document.getElementById('logs');
        const t = new Date().toLocaleTimeString();
        if (area) area.innerHTML = `[${t}] ${msg}<br>` + area.innerHTML;
    }

    function updateSelectedSummary() {
        const summaryEl = document.getElementById('selected-summary');
        if (!summaryEl) return;
        let selectedModels = [];
        try { selectedModels = JSON.parse(localStorage.getItem('selected_models') || '[]'); } catch (e) { selectedModels = []; }
        const source = document.getElementById('prediction-source')?.value ?? null;
        const folderPath = document.getElementById('prediction-folder-path')?.value ?? null;
        let parts = [];
        parts.push(`<strong>Modelos:</strong> ${selectedModels.length ? selectedModels.join(', ') : 'nenhum'}`);
        if (source) {
            parts.push(`<strong>Fonte:</strong> ${source}`);
            if (['random', 'folder'].includes(source)) parts.push(`<strong>Path:</strong> ${folderPath || '<em>não informado</em>'}`);
        }
        summaryEl.innerHTML = parts.map(p => `<div style="margin-bottom:6px">${p}</div>`).join('');
        if ((selectedModels && selectedModels.length > 0) || source) summaryEl.classList.remove('hidden'); else summaryEl.classList.add('hidden');
    }

    const DEFAULT_CONFIG_KEY = 'yolo_default_config';
    // bump this when you change the built-in defaultConfig so browsers will auto-upgrade
    const DEFAULT_CONFIG_VERSION = 1;
    const defaultConfig = {
        // --- Configurações Principais de Treinamento ---
        model: "yolo11x-cls.pt",             // Argumento de Treinamento: Modelo base
        task: "classify",                   // Argumento de Treinamento: Modo (train/val)
        mode: "train",                     // Argumento de Treinamento: Modo (train/val)
        data: "/content/02-3",               // Argumento de Treinamento: Caminho do dataset
        epochs: 50,                          // Argumento de Treinamento: Número de épocas
        patience: 100,                       // Argumento de Treinamento: Paciência para Early Stopping
        batch: 16,                           // Argumento de Treinamento: Tamanho do lote
        imgsz: 224,                          // Argumento de Treinamento: Tamanho da imagem
        save: true,                          // Argumento de Treinamento: Salvar checkpoints
        save_period: -1,                     // Argumento de Treinamento: Frequência de salvamento de checkpoint
        cache: false,                        // Argumento de Treinamento: Cache de imagens
        device: "cpu",                         // Argumento de Treinamento: Dispositivo (GPU)
        workers: 8,                          // Argumento de Treinamento: Threads de carregamento de dados
        project: "/content/drive/MyDrive/yolo_classificacao_resultados", // Argumento de Treinamento: Diretório do projeto
        name: "treinamento_classificacao",   // Argumento de Treinamento: Nome da execução
        exist_ok: false,                     // Argumento de Treinamento: Permitir sobrescrita
        pretrained: true,                    // Argumento de Treinamento: Usar pesos pré-treinados
        optimizer: "auto",                   // Argumento de Treinamento: Otimizador
        seed: 0,                             // Argumento de Treinamento: Seed aleatória
        deterministic: true,                 // Argumento de Treinamento: Determinismo
        single_cls: false,                   // Argumento de Treinamento: Single class (Útil para classificação binária)
        classes: null,                       // Argumento de Treinamento: Classes a incluir
        rect: false,                         // Argumento de Treinamento: Treinamento retangular
        multi_scale: false,                  // Argumento de Treinamento: Multi-escala
        cos_lr: false,                       // Argumento de Treinamento: Learning Rate de Cosseno
        close_mosaic: 10,                    // Argumento de Treinamento: Desativar mosaic nas últimas épocas
        resume: false,                       // Argumento de Treinamento: Retomar treinamento
        amp: true,                           // Argumento de Treinamento: Mixed Precision
        fraction: 1.0,                       // Argumento de Treinamento: Fração do dataset
        profile: false,                      // Argumento de Treinamento: Profiling
        freeze: null,                        // Argumento de Treinamento: Congelar camadas
        val: true,                           // Argumento de Treinamento: Ativar validação
        plots: true,                         // Argumento de Treinamento: Gerar gráficos
        compile: false,                      // Argumento de Treinamento: Compilação PyTorch 2.x
        verbose: true,                       // Argumento de Treinamento: Verbose/Detalhamento

        // --- Configurações de Hiperparâmetros (HPs) ---
        lr0: 0.01,                           // HP: Taxa de aprendizado inicial
        lrf: 0.01,                           // HP: Taxa de aprendizado final
        momentum: 0.937,                     // HP: Momentum
        weight_decay: 0.0005,                // HP: Decaimento de peso
        warmup_epochs: 3.0,                  // HP: Épocas de aquecimento
        warmup_momentum: 0.8,                // HP: Momentum de aquecimento
        warmup_bias_lr: 0.1,                 // HP: LR de bias de aquecimento
        box: 7.5,                            // HP: Peso da perda de caixa (relevante para detecção/segmentação)
        cls: 0.5,                            // HP: Peso da perda de classificação
        dfl: 1.5,                            // HP: Peso da perda DFL
        pose: 12.0,                          // HP: Peso da perda de pose (relevante para estimativa de pose)
        kobj: 1.0,                           // HP: Peso da perda de keypoint (relevante para estimativa de pose)
        nbs: 64,                             // HP: Tamanho nominal do lote
        overlap_mask: true,                  // HP: Máscara de sobreposição (relevante para segmentação)
        mask_ratio: 4,                       // HP: Taxa de subamostragem (relevante para segmentação)
        dropout: 0.0,                        // HP: Taxa de dropout (relevante para classificação)

        // --- Configurações de Aumento de Dados ---
        hsv_h: 0.015,                        // Aumento: Tonalidade
        hsv_s: 0.7,                          // Aumento: Saturação
        hsv_v: 0.4,                          // Aumento: Brilho/Valor
        degrees: 0.0,                        // Aumento: Rotação
        translate: 0.1,                      // Aumento: Translação
        scale: 0.5,                          // Aumento: Escala
        shear: 0.0,                          // Aumento: Cisalhamento
        perspective: 0.0,                    // Aumento: Perspectiva
        flipud: 0.0,                         // Aumento: Inversão vertical
        fliplr: 0.5,                         // Aumento: Inversão horizontal
        bgr: 0.0,                            // Aumento: Inversão BGR
        mosaic: 1.0,                         // Aumento: Mosaic
        mixup: 0.0,                          // Aumento: MixUp
        cutmix: 0.0,                         // Aumento: CutMix
        copy_paste: 0.0,                     // Aumento: Copy-Paste (relevante para segmentação)
        copy_paste_mode: "flip",             // Aumento: Modo Copy-Paste
        auto_augment: "randaugment",         // Aumento: Auto Augment
        erasing: 0.4,                        // Aumento: Erasing
        augment: false,                      // Aumento: Ativar aumento (geralmente ligado pelo mosaic, mas bom ter)

        // --- Outros Argumentos de Treinamento ---
        cfg: null,
        iou: 0.7,
        conf: null,
        agnostic_nms: false,
        max_det: 300,
        retina_masks: false,
        keras: false,
        int8: false,
        half: false,
        dnn: false,
        dynamic: false,
        line_width: null,
        embed: null,
        show_boxes: true,
        show_conf: true,
        show_labels: true,
        vid_stride: 1,
        visualize: false,

        // Argumentos não documentados para 'train' mas existentes em outras chamadas ou padrões
        // Mantenho-os, mas eles não devem causar erro se não forem utilizados pelo método:
        save_conf: false,
        save_crop: false,
        save_frames: false,
        save_json: false,
        save_txt: false,
        time: null,
        workspace: null
    };

    // ensure the default contains a version so load/save logic can detect upgrades
    defaultConfig.config_version = DEFAULT_CONFIG_VERSION;

    function loadConfig() {
        // Try to load from localStorage. If the stored config is older (or missing a
        // version) than the built-in DEFAULT_CONFIG_VERSION, overwrite it with the
        // new default so edits in the code take effect for users.
        try {
            let raw = null;
            // prefer localStorage but fallback to sessionStorage if available
            try { raw = localStorage.getItem(DEFAULT_CONFIG_KEY); } catch (e) { raw = null; }
            if (!raw) {
                try { raw = sessionStorage.getItem(DEFAULT_CONFIG_KEY); } catch (e) { raw = null; }
            }
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    const storedVer = Number(parsed?.config_version || 0);
                    if (storedVer >= DEFAULT_CONFIG_VERSION) return parsed;
                    // stored version is older -> replace with new default
                    const base = JSON.parse(JSON.stringify(defaultConfig));
                    try { localStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(base)); } catch (e) { try { sessionStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(base)); } catch (e2) { /* ignore save errors */ } }
                    showLog('Configuração local desatualizada; atualizando para o novo padrão.');
                    return base;
                } catch (e) {
                    // malformed JSON -> fallthrough to return default
                }
            }
        } catch (e) { /* ignore access errors */ }
        return JSON.parse(JSON.stringify(defaultConfig));
    }
    function saveConfig(obj) {
        // ensure version is present before saving so future code upgrades are detected
        try {
            if (!obj || typeof obj !== 'object') obj = {};
            obj.config_version = DEFAULT_CONFIG_VERSION;
            localStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(obj));
            return true;
        } catch (e) {
            return false;
        }
    }
    function renderConfigPreview(cfg) {
        const pre = document.getElementById('config-preview');
        if (!pre) return;
        // pretty print with 2-space indent, but hide extremely long paths if needed
        pre.textContent = JSON.stringify(cfg, null, 2);
    }

    function bindPageHandlers(page) {
        if (page === 'treinamento') {
            // document.getElementById('start-training-btn')?.addEventListener('click', startTraining);
            // wire config UI
            const editBtn = document.getElementById('edit-config-btn');
            const saveBtn = document.getElementById('save-config-btn');
            const cancelBtn = document.getElementById('cancel-config-btn');
            const resetBtn = document.getElementById('reset-config-btn');
            const configPreview = document.getElementById('config-preview');
            const configEditorWrap = document.getElementById('config-editor');
            const configTextarea = document.getElementById('config-json');
            const configError = document.getElementById('config-error');

            // load and render on page show
            const currentCfg = loadConfig();
            renderConfigPreview(currentCfg);

            editBtn?.addEventListener('click', () => {
                // Inline edit: replace the preview with a textarea in-place
                if (!configPreview) return;
                configError.classList.add('hidden');
                // if an inline editor already exists, focus it
                let inlineTa = document.getElementById('config-json-inline');
                if (inlineTa) { inlineTa.focus(); return; }

                // Always use the in-memory currentCfg as the source of truth when editing
                const orig = JSON.stringify(currentCfg, null, 2);
                // hide preview and insert textarea after it
                configPreview.style.display = 'none';
                inlineTa = document.createElement('textarea');
                inlineTa.id = 'config-json-inline';
                inlineTa.className = 'config-textarea';
                inlineTa.style.width = '100%';
                inlineTa.style.minHeight = '220px';
                // dark theme for inline editor to reduce glare while editing
                inlineTa.style.backgroundColor = '#1e1e2a';
                inlineTa.style.color = '#e6eef8';
                inlineTa.style.border = '1px solid #333';
                inlineTa.style.padding = '12px';
                inlineTa.style.borderRadius = '6px';
                inlineTa.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace';
                inlineTa.style.fontSize = '13px';
                inlineTa.value = orig;
                configPreview.parentNode.insertBefore(inlineTa, configPreview.nextSibling);

                // create inline buttons (save / cancel)
                let btnWrap = document.getElementById('config-inline-buttons');
                if (!btnWrap) {
                    btnWrap = document.createElement('div');
                    btnWrap.id = 'config-inline-buttons';
                    btnWrap.style.marginTop = '8px';
                    // dark-styled inline buttons to match editor
                    btnWrap.innerHTML = '<button id="config-save-inline" style="background:#2563eb;color:#fff;border:none;padding:8px 12px;border-radius:6px;margin-right:8px">Salvar</button> <button id="config-cancel-inline" style="background:#2b2b2b;color:#fff;border:none;padding:8px 12px;border-radius:6px">Cancelar</button> <span id="config-inline-download" style="margin-left:8px"></span>';
                    btnWrap.style.display = 'flex';
                    btnWrap.style.alignItems = 'center';
                    configPreview.parentNode.insertBefore(btnWrap, inlineTa.nextSibling);
                }

                const saveInline = async () => {
                    const txt = inlineTa.value;
                    try {
                        const parsed = JSON.parse(txt);
                        if (typeof parsed !== 'object' || parsed === null) throw new Error('Config must be a JSON object');
                        // try saving to localStorage with helpful fallback
                        // prefer saveConfig which injects version; fallback to download if it fails
                        parsed.config_version = DEFAULT_CONFIG_VERSION;
                        const ok = saveConfig(parsed);
                        if (!ok) {
                            // localStorage failed. Attempt sessionStorage (tab-lifetime) as a fallback
                            try {
                                sessionStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(parsed));
                                showLog('localStorage indisponível — configuração salva na sessão (sessionStorage).');
                            } catch (eSess) {
                                configError.textContent = `Aviso: Falha ao salvar no localStorage e sessionStorage.`;
                                configError.classList.remove('hidden');
                            }
                            // provide file download link so user can persist manually
                            try {
                                const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const dl = document.createElement('a');
                                dl.href = url;
                                dl.download = 'yolo_config.json';
                                dl.textContent = 'Baixar configuração (fallback)';
                                const holder = document.getElementById('config-inline-download');
                                if (holder) { holder.innerHTML = ''; holder.appendChild(dl); }
                            } catch (e2) { console.error('Download fallback failed', e2); }
                            // do not abort: still update in-memory so subsequent actions use the new config
                        }

                        // persist in-memory and update preview (works whether saved to storage or not)
                        Object.assign(currentCfg, parsed);
                        renderConfigPreview(currentCfg);
                        showLog('Configuração atualizada (salva localmente ou em sessão).');
                        // cleanup inline editor
                        cleanupInlineEditor();
                    } catch (e) {
                        configError.textContent = `Erro: ${e.message || e}`;
                        configError.classList.remove('hidden');
                    }
                };

                const cancelInline = () => {
                    cleanupInlineEditor();
                    configError.classList.add('hidden');
                };

                function cleanupInlineEditor() {
                    const ta = document.getElementById('config-json-inline');
                    if (ta) ta.remove();
                    const wrap = document.getElementById('config-inline-buttons');
                    if (wrap) wrap.remove();
                    const dl = document.getElementById('config-inline-download');
                    if (dl) dl.remove();
                    configPreview.style.display = '';
                }

                // wire inline buttons
                document.getElementById('config-save-inline')?.addEventListener('click', saveInline);
                document.getElementById('config-cancel-inline')?.addEventListener('click', cancelInline);
                inlineTa.focus();
            });

            cancelBtn?.addEventListener('click', () => {
                configEditorWrap.classList.add('hidden');
                configError.classList.add('hidden');
            });

            saveBtn?.addEventListener('click', () => {
                // validate JSON
                try {
                    const parsed = JSON.parse(configTextarea.value);
                    // basic validation: must be object
                    if (typeof parsed !== 'object' || parsed === null) throw new Error('Config must be a JSON object');
                    // persist and update preview
                    const ok = saveConfig(parsed);
                    if (!ok) throw new Error('Falha ao salvar no localStorage');
                    // update in-memory reference used by page
                    Object.assign(currentCfg, parsed);
                    renderConfigPreview(currentCfg);
                    configEditorWrap.classList.add('hidden');
                    configError.classList.add('hidden');
                    showLog('Configuração salva localmente.');
                } catch (e) {
                    configError.textContent = `Erro: ${e.message || e}`;
                    configError.classList.remove('hidden');
                }
            });

            resetBtn?.addEventListener('click', () => {
                // restore original defaults
                const base = JSON.parse(JSON.stringify(defaultConfig));
                saveConfig(base);
                renderConfigPreview(base);
                showLog('Configuração restaurada para o padrão.');
            });

            // Load dataset select options from server (uploaded folders)
            async function loadDatasetsIntoSelect() {
                const sel = document.getElementById('dataset-select');
                if (!sel) return;
                sel.innerHTML = '<option>Carregando...</option>';
                try {
                    const datasets = await window.API.getDatasets();
                    if (!datasets || datasets.length === 0) {
                        sel.innerHTML = '<option value="">Nenhum dataset encontrado</option>';
                        return;
                    }
                    // preserve previous selection if present
                    const prev = sel.value;
                    sel.innerHTML = datasets.map(d => `<option value="${d}">${d}</option>`).join('');
                    if (prev) {
                        try { sel.value = prev; } catch (e) { /* ignore */ }
                    }
                } catch (e) {
                    sel.innerHTML = '<option value="">Erro ao carregar datasets</option>';
                }
            }

            // Folder upload: wire upload button to open folder picker and upload files
            document.getElementById('upload-dataset-btn')?.addEventListener('click', async () => {
                try {
                    // create invisible input that allows selecting a folder
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    // allow folder selection in Chromium-based browsers
                    input.setAttribute('webkitdirectory', '');
                    input.setAttribute('directory', '');

                    input.addEventListener('change', async () => {
                        const files = Array.from(input.files || []);
                        if (!files.length) return;
                        const btn = document.getElementById('upload-dataset-btn');
                        if (btn) { btn.disabled = true; btn.textContent = '⏳ Enviando...'; }
                        showLog(`Enviando ${files.length} arquivos para upload...`);
                        const fd = new FormData();
                        for (const f of files) {
                            // preserve relative path when possible
                            const rel = f.webkitRelativePath || f.name;
                            fd.append('files', f, rel);
                        }
                        try {
                            // blueprint is registered under /train in the Flask app
                            const res = await fetch(`${window.API.API_BASE}/train/upload-folder`, { method: 'POST', body: fd });
                            const json = res && res.ok ? await res.json() : null;
                            if (json && json.saved) {
                                showLog(`Upload concluído. Arquivos salvos: ${json.saved}`);
                                alert(`Upload concluído. Arquivos salvos: ${json.saved}`);
                                // refresh dataset select so newly uploaded folder appears
                                try { await loadDatasetsIntoSelect(); } catch (e) { /* ignore */ }
                            } else {
                                showLog('Upload retornou erro. Veja console/network.');
                                alert('Erro no upload. Veja console para detalhes.');
                                console.error('Upload response', res, json);
                            }
                        } catch (e) {
                            console.error('Upload error', e);
                            showLog('Erro no upload. Veja console para detalhes.');
                            alert('Erro no upload. Veja console para detalhes.');
                        } finally {
                            if (btn) { btn.disabled = false; btn.textContent = '📁 Upload Pasta com Imagens'; }
                        }
                    });

                    // trigger chooser
                    document.body.appendChild(input);
                    input.click();
                    // remove input after some time
                    setTimeout(() => input.remove(), 30000);
                } catch (e) {
                    console.error('Failed to open folder picker', e);
                    alert('Não foi possível abrir o seletor de pastas neste navegador. Tente usar Chrome/Edge.');
                }
            });

            // initial load of datasets into the select
            loadDatasetsIntoSelect();
            // --- 🎯 NOVO: Inicializa o controle de estado e start/cancelamento ---
            // Certifique-se de que o TrainingControl está carregado no <script>
            if (global.TrainingControl && typeof global.TrainingControl.init === 'function') {
                // Esta chamada inicializa os event listeners do TrainingControl
                global.TrainingControl.init();
            } else {
                showLog('[ERRO] O módulo TrainingControl não foi carregado. Verifique a tag <script>.');
            }
        }

        if (page === 'predicao') {
            // wire run button
            document.getElementById('run-prediction-btn')?.addEventListener('click', runPrediction);
            const container = document.getElementById('models-container');
            const selectAllCheckbox = document.getElementById('select-all-models');

            if (!container || !selectAllCheckbox) {
                const legacySelect = document.getElementById('prediction-model-select');
                if (legacySelect) window.API.getModels().then(data => {
                    const items = data ?? [];
                    legacySelect.innerHTML = items.map(m => `<option value="${m}">${m}</option>`).join('');
                    Array.from(legacySelect.options).forEach(o => o.selected = true);
                    try { localStorage.setItem('selected_models', JSON.stringify(Array.from(legacySelect.options).map(o => o.value))); } catch (e) { }
                });
                return;
            }

            async function saveSelectionFromContainer() {
                const checked = Array.from(container.querySelectorAll(".model-checkbox")).filter(cb => cb.checked).map(cb => cb.value);
                try { localStorage.setItem("selected_models", JSON.stringify(checked)); } catch (e) { }
                updateSelectedSummary();
            }

            async function loadModelsIntoContainer() {
                container.innerHTML = '';
                // indicate loading
                const runBtn = document.getElementById('run-prediction-btn');
                if (runBtn) { runBtn.disabled = true; runBtn.textContent = '⏳ Carregando modelos...'; }

                const items = await window.API.getModels();
                let stored = [];
                try { stored = JSON.parse(localStorage.getItem('selected_models') || '[]'); } catch (e) { stored = []; }
                const defaultAll = stored.length === 0;
                if (!items || items.length === 0) {
                    showLog('Nenhum modelo retornado pela API (/models). Verifique o backend.');
                    container.innerHTML = '<div class="card">Nenhum modelo disponível.</div>';
                    if (runBtn) { runBtn.disabled = true; runBtn.textContent = '▶️ Executar Predição'; }
                    updateSelectedSummary();
                    return;
                }
                items.forEach((m, idx) => {
                    const id = `model-cb-${idx}`;
                    const wrap = document.createElement('label');
                    wrap.className = 'flex items-center gap-2 cursor-pointer select-none p-1 rounded';
                    const cb = document.createElement('input');
                    cb.type = 'checkbox'; cb.value = m; cb.id = id; cb.className = 'h-4 w-4 model-checkbox';
                    cb.checked = defaultAll ? true : stored.includes(m);
                    cb.addEventListener('change', () => {
                        const allCheckboxes = Array.from(container.querySelectorAll(".model-checkbox"));
                        if (selectAllCheckbox) selectAllCheckbox.checked = allCheckboxes.length > 0 && allCheckboxes.every(x => x.checked);
                        saveSelectionFromContainer();
                    });
                    wrap.appendChild(cb); wrap.appendChild(document.createTextNode(m));
                    container.appendChild(wrap);
                });
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = Array.from(container.querySelectorAll(".model-checkbox")).every(x => x.checked);
                    selectAllCheckbox.addEventListener('change', (e) => {
                        const checked = e.target.checked;
                        Array.from(container.querySelectorAll(".model-checkbox")).forEach(cb => {
                            if (cb.checked !== checked) { cb.checked = checked; cb.dispatchEvent(new Event('change', { bubbles: true })); }
                        });
                        saveSelectionFromContainer();
                    });
                }
                // persist default selection and update summary
                saveSelectionFromContainer();
                if (runBtn) { runBtn.disabled = false; runBtn.textContent = '▶️ Executar Predição'; }
            }

            loadModelsIntoContainer();

            // show/hide folder path input based on source select
            const srcSelect = document.getElementById('prediction-source');
            const folderInputWrap = document.getElementById('prediction-folder-input');
            const folderPathInput = document.getElementById('prediction-folder-path');

            function updateFolderInputVisibility() {
                if (!srcSelect || !folderInputWrap || !folderPathInput) return;
                const v = srcSelect.value;
                const shouldShow = ['folder', 'random'].includes(v);
                if (shouldShow) {
                    folderInputWrap.classList.remove('hidden');
                    folderInputWrap.setAttribute('aria-hidden', 'false');
                    // const suggested = './app/storage/datasets_yolo/CM/01';
                    const suggested = './projeto/app/storage/datasets_yolo/CM/01';
                    if (v === 'folder') {
                        // readonly suggested path for validation dataset mode
                        if (!folderPathInput.value || folderPathInput.value.trim() === '') folderPathInput.value = suggested;
                        folderPathInput.disabled = true;
                        folderPathInput.setAttribute('readonly', 'true');
                        folderPathInput.setAttribute('aria-readonly', 'true');
                    } else {
                        // random: allow editing
                        if ((folderPathInput.value || '').trim() === suggested) folderPathInput.value = '';
                        folderPathInput.disabled = false;
                        folderPathInput.removeAttribute('readonly');
                        folderPathInput.removeAttribute('aria-readonly');
                    }
                } else {
                    folderInputWrap.classList.add('hidden');
                    folderInputWrap.setAttribute('aria-hidden', 'true');
                    // ensure input editable when hidden
                    folderPathInput.disabled = false;
                    folderPathInput.removeAttribute('readonly');
                    folderPathInput.removeAttribute('aria-readonly');
                }
                updateSelectedSummary();
            }

            if (srcSelect) {
                srcSelect.addEventListener('change', updateFolderInputVisibility);
                // set initial visibility
                updateFolderInputVisibility();
            }

            document.getElementById('prediction-source')?.addEventListener('change', updateSelectedSummary);
            document.getElementById('prediction-folder-path')?.addEventListener('input', updateSelectedSummary);
            document.getElementById('models-container')?.addEventListener('change', updateSelectedSummary);
            document.getElementById('select-all-models')?.addEventListener('change', updateSelectedSummary);
            updateSelectedSummary();
        }


    }

    // ... dentro do seu módulo principal (function(global) { ... })
    // ... (após todas as definições de funções auxiliares como loadConfig, saveConfig, etc.)

    function collectTrainingPayload() {
        // === 1. LÓGICA DE COLETA DE DADOS ===
        const dataset = document.getElementById('dataset-select')?.value ?? '';
        // Certifique-se de que os IDs dos elementos de divisão do dataset estão corretos:
        const trainPercent = Number(document.getElementById('train-percent')?.value ?? 70);
        const valPercent = Number(document.getElementById('val-percent')?.value ?? 20);
        const testPercent = Number(document.getElementById('test-percent')?.value ?? 10);
        const randomCount = Number(document.getElementById('random-count')?.value ?? 0);
        const randTrain = Number(document.getElementById('rand-train-percent')?.value ?? 70);
        const randVal = Number(document.getElementById('rand-val-percent')?.value ?? 20);
        const randTest = Number(document.getElementById('rand-test-percent')?.value ?? 10);

        // Tipos de imagens e pré-processamento (corrigindo a busca dos elementos)
        const typesToInclude = Array.from(document.querySelectorAll('#tipo-checkboxes-tipos input[type="checkbox"]:checked')).map(i => i.value);
        const preprocessingTypes = Array.from(document.querySelectorAll('#tipo-checkboxes-preprocessing input[type="checkbox"]:checked')).map(i => i.value);

        // 2. Leitura da Configuração de Treino (Full Config)
        let fullConfig = null;
        const inlineTa = document.getElementById('config-json-inline');

        // Prioriza o JSON do editor inline se ele estiver aberto e for válido
        if (inlineTa) {
            try {
                const parsedInline = JSON.parse(inlineTa.value);
                fullConfig = parsedInline;
            } catch (e) {
                fullConfig = null; // Inválido, cai para o local storage
            }
        }

        // Se não houver config inline válida, carrega a versão salva ou a padrão
        if (!fullConfig) fullConfig = loadConfig();

        // 3. Montagem do Payload
        const payload = {
            dataset: dataset,
            save_checkpoints: !!document.getElementById('save-checkpoints')?.checked,
            exp_name: document.getElementById('exp-name')?.value || `exp-${Date.now()}`,
            dataset_config: {
                train_percent: trainPercent,
                val_percent: valPercent,
                test_percent: testPercent,
                types_to_include: typesToInclude,
                random_count: randomCount,
                random_split: { train: randTrain, val: randVal, test: randTest },
                preprocessing: preprocessingTypes
            },
            full_config: fullConfig // ENVIA A CONFIGURAÇÃO CORRETA/EDITADA
        };

        return payload;
    }
    // ...
    // Adicione a função auxiliar ao objeto global da UI
    // global.UI.collectTrainingPayload = collectTrainingPayload;
    // ...


    // Adicione esta função ao seu arquivo JS (globalmente acessível, como no seu módulo IIFE)
    /**
     * Configura uma conexão SSE para receber logs do backend em tempo real.
     * @param {string} jobId O ID da tarefa de treinamento para buscar os logs.
     */
    function streamTrainingLogs(jobId) {
        const area = document.getElementById('logs');
        if (!area) return;

        // Limpa o log e adiciona a mensagem inicial de conexão
        area.value = `[INFO] Conectando ao log de job ${jobId}...\n`;
        area.scrollTop = area.scrollHeight;

        // ATENÇÃO: O endpoint do FLASK deve ser '/train/logs/<job_id>' para SSE
        const source = new EventSource(`${window.API.API_BASE}/train/logs/${jobId}`);

        source.onmessage = function (event) {
            // Os dados vêm no formato 'data: seu log aqui'
            const data = event.data;

            // Adiciona novos dados ao topo do textarea (seu showLog original fazia isso)
            // Note: Se o elemento 'logs' for um textarea, a forma abaixo é mais comum para logs em tempo real
            area.value = `[${new Date().toLocaleTimeString()}] ${data}\n` + area.value;
            // Se você quiser que o log mais recente fique no TOPO: remova a linha abaixo.
            // Se você quiser que o log mais recente fique no RODAPÉ: adicione area.value += data e area.scrollTop = area.scrollHeight.

            if (data.includes("TREINAMENTO_COMPLETO")) {
                showLog(`Treinamento concluído para Job ID: ${jobId}`);
                source.close();
            } else if (data.includes("ERRO_TREINAMENTO")) {
                showLog(`Erro fatal durante o treinamento para Job ID: ${jobId}`);
                source.close();
            }
        };

        source.onerror = function (e) {
            if (source.readyState === 0) {
                showLog(`[ERROR] Conexão de log falhou ou foi fechada pelo servidor. Job ID: ${jobId}`);
            } else {
                showLog(`[ERROR] Erro de stream de log. Fechando conexão. Job ID: ${jobId}`);
            }
            source.close();
        };
    }

    // ✅ ATUALIZADO: Layout de Comparação Lado a Lado por Imagem
    async function runPrediction() {
        // --- (Código de Coleta de Configuração e Validação Omitido, mantido original) ---
        let selected = [];
        try {
            const checked = Array.from(document.querySelectorAll('.model-checkbox')).filter(cb => cb.checked).map(cb => cb.value);
            if (checked && checked.length > 0) {
                selected = checked;
            } else {
                selected = JSON.parse(localStorage.getItem('selected_models') || '[]') || [];
            }
        } catch (e) {
            try { selected = JSON.parse(localStorage.getItem('selected_models') || '[]') || []; } catch (e2) { selected = []; }
        }

        if (!selected || selected.length === 0) {
            alert('Nenhum modelo selecionado. Selecione pelo menos um modelo antes de executar a predição.');
            const container = document.getElementById('models-container');
            if (container) container.scrollIntoView({ behavior: 'smooth', block: 'center' });
            showLog('Nenhum modelo selecionado');
            return;
        }

        const source = document.getElementById('prediction-source')?.value ?? 'val';
        let folderPath = null;
        if (['random', 'folder'].includes(source)) {
            folderPath = document.getElementById('prediction-folder-path')?.value?.trim() || null;
            if (source === 'random' && !folderPath) {
                showLog('Informe o caminho da pasta');
                document.getElementById('prediction-folder-path')?.focus();
                return;
            }
        }

        showLog(`Enviando predição para: ${selected.join(', ')}`);
        const payload = { models: selected, source, preprocessors: [], options: {} };
        if (folderPath) payload.options.path = folderPath;

        const runBtn = document.getElementById('run-prediction-btn');
        if (runBtn) { runBtn.disabled = true; runBtn.textContent = '⏳ Executando...'; }

        let res = await window.API.postPredict(payload);

        if (runBtn) { runBtn.disabled = false; runBtn.textContent = '▶️ Executar Predição'; }
        if (!res) {
            showLog('Erro: API de predição não respondeu ou retornou erro. Veja console/network para detalhes.');
        }

        const container = document.getElementById('prediction-results');
        if (!container) return;
        container.innerHTML = '';

        try {
            // 🛑 PASSO 1: Reorganizar resultados por IMAGEM (chave de comparação)
            const imagesToCompare = {}; // Chave: nome_do_arquivo.ext

            for (const model of selected) {
                let modelImages = [];
                // Tenta obter os resultados da API, se não, usa o Finder (Fallback)
                if (res?.results_summary?.[model]?.images) {
                    modelImages = res.results_summary[model].images;
                } else {
                    modelImages = await window.Finder.findImagesForModel(model);
                }

                modelImages.forEach(imageUrl => {
                    // Obtém o nome do arquivo (ex: '001.jpg')
                    const imageKey = imageUrl.split('/').pop();

                    if (!imagesToCompare[imageKey]) {
                        imagesToCompare[imageKey] = { models: [] };
                    }

                    // Adiciona a predição deste modelo à imagem
                    imagesToCompare[imageKey].models.push({
                        name: model,
                        url: imageUrl,
                        // Adicione aqui outros metadados, como classe predita, se disponíveis na sua API
                    });
                });
            }

            // 🛑 PASSO 2: Renderizar os resultados agrupados
            const imageKeys = Object.keys(imagesToCompare);

            if (imageKeys.length === 0) {
                container.innerHTML = `<div class="card">Nenhuma imagem de confusão encontrada para os modelos selecionados.</div>`;
                return;
            }

            for (const imageKey of imageKeys) {
                const imageGroup = imagesToCompare[imageKey];

                const groupDiv = document.createElement('div');
                // Usamos 'model-result' e adicionamos uma nova classe para estilizar a comparação
                groupDiv.className = 'model-result image-comparison-group';

                // Título intuitivo
                groupDiv.innerHTML = `<h4 style="margin-bottom:10px;font-weight:700">🖼️ Comparação da Imagem: ${imageKey}</h4>`;

                const comparisonGrid = document.createElement('div');
                comparisonGrid.className = 'comparison-grid'; // Nova classe para layout lado a lado (veja CSS)

                // Renderiza as predições de todos os modelos
                for (const prediction of imageGroup.models) {

                    const modelCard = document.createElement('div');
                    modelCard.className = 'comparison-card';

                    // Note: Aqui usamos a função openImageModal que está definida globalmente
                    modelCard.innerHTML = `
                    <div class="model-name-label">Modelo: <strong>${prediction.name}</strong></div>
                    <div class="card image-card">
                        <img src="${prediction.url}" alt="Predição de ${prediction.name} para ${imageKey}" 
                             onclick="openImageModal(this.src, this.alt)"/>
                    </div>
                `;
                    comparisonGrid.appendChild(modelCard);
                }

                groupDiv.appendChild(comparisonGrid);
                container.appendChild(groupDiv);
            }

        } catch (e) {
            console.error('Error rendering prediction results', e);
            showLog('Erro ao renderizar resultados. Veja console/debug output.');
        }

        showLog(`Predição concluída. Imagens comparadas: ${Object.keys(imagesToCompare).length}.`);
    }

    // -------- Image modal helpers --------
    function openImageModal(src, alt) {
        const modal = document.getElementById('img-modal');
        const img = document.getElementById('img-modal-img');
        const caption = document.getElementById('img-modal-caption');
        if (!modal || !img) return;
        img.src = src;
        img.alt = alt || '';
        if (caption) caption.textContent = alt || '';
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        // focus for accessibility
        document.getElementById('img-modal-close')?.focus();
    }

    function closeImageModal() {
        const modal = document.getElementById('img-modal');
        const img = document.getElementById('img-modal-img');
        if (!modal || !img) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        img.src = '';
        img.alt = '';
    }

    // delegated click handler for images (anywhere in document)
    document.addEventListener('click', (e) => {
        const imgEl = e.target.closest && e.target.closest('.comparison-card img');
        if (imgEl) {
            // prevent default navigation if any
            e.preventDefault();
            openImageModal(imgEl.src || imgEl.getAttribute('data-src'), imgEl.alt || imgEl.getAttribute('data-caption') || '');
        }
    });

    // close modal when clicking backdrop or close button, and on Esc
    document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest && e.target.closest('#img-modal-close');
        const backdrop = e.target.closest && e.target.closest('#img-modal-backdrop');
        if (closeBtn || backdrop) {
            closeImageModal();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeImageModal();
    });

    global.UI = {
        init: () => {
            // document.getElementById('sidebar')?.querySelector('.toggle-btn')?.addEventListener('click', toggleSidebar);

            document.querySelectorAll('.menu-item').forEach(mi => {
                mi.removeEventListener('click', mi._uiClickListener);
                mi._uiClickListener = (e) => {
                    const page = mi.dataset.page;
                    if (page) navigate(page);
                };
                mi.addEventListener('click', mi._uiClickListener);
            });
            global.navigate = navigate;
            global.toggleSidebar = toggleSidebar;
            navigate('treinamento');

            // ensure modal close button/backdrop listeners exist (in case init runs after DOM)
            document.getElementById('img-modal-close')?.addEventListener('click', closeImageModal);
            document.getElementById('img-modal-backdrop')?.addEventListener('click', closeImageModal);
        },
        navigate,
        collectTrainingPayload, // EXPÕE a nova função de coleta
        openImageModal,
    };
})(window);


