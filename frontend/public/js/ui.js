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

    async function loadPage(page) {
        const view = document.getElementById('view');
        const tpl = PAGES[page];
        if (!tpl) { if (view) view.innerHTML = '<p>Página não encontrada.</p>'; return; }
        if (cache[tpl]) { if (view) view.innerHTML = cache[tpl]; bindPageHandlers(page); return; }
        try {
            const res = await fetch(tpl);
            if (!res.ok) throw new Error('fetch-fail');
            const html = await res.text();
            cache[tpl] = html;
            if (view) view.innerHTML = html;
            bindPageHandlers(page);
        } catch (e) {
            if (view) view.innerHTML = `<div class="card"><p>Erro carregando página (${tpl}).</p></div>`;
        }
    }

    function showLog(msg) {
        const area = document.getElementById('log-area');
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
    const defaultConfig = {
        agnostic_nms: false, amp: true, augment: false, auto_augment: "randaugment",
        batch: 16, bgr: 0.0, box: 7.5, cache: false, cfg: null, classes: null,
        close_mosaic: 10, cls: 0.5, compile: false, conf: null, copy_paste: 0.0,
        copy_paste_mode: "flip", cos_lr: false, cutmix: 0.0, data: "/content/02-3",
        degrees: 0.0, deterministic: true, device: "0", dfl: 1.5, dnn: false,
        dropout: 0.0, dynamic: false, embed: null, epochs: 50, erasing: 0.4,
        exist_ok: false, fliplr: 0.5, flipud: 0.0, format: "torchscript",
        fraction: 1.0, freeze: null, half: false, hsv_h: 0.015, hsv_s: 0.7, hsv_v: 0.4,
        imgsz: 224, int8: false, iou: 0.7, keras: false, kobj: 1.0, line_width: null,
        lr0: 0.01, lrf: 0.01, mask_ratio: 4, max_det: 300, mixup: 0.0, mode: "train",
        model: "yolov8n-cls.pt", momentum: 0.937, mosaic: 1.0, multi_scale: false,
        name: "treinamento_classificacao", nbs: 64, nms: false, opset: null,
        optimize: false, optimizer: "auto", overlap_mask: true, patience: 100,
        perspective: 0.0, plots: true, pose: 12.0, pretrained: true, profile: false,
        project: "/content/drive/MyDrive/yolo_classificacao_resultados", rect: false,
        resume: false, retina_masks: false, save: true, save_conf: false, save_crop: false,
        save_dir: "/content/drive/MyDrive/yolo_classificacao_resultados/treinamento_classificacao",
        save_frames: false, save_json: false, save_period: -1, save_txt: false,
        scale: 0.5, seed: 0, shear: 0.0, show: false, show_boxes: true, show_conf: true,
        show_labels: true, simplify: true, single_cls: false, source: null, split: "val",
        stream_buffer: false, task: "classify", time: null, tracker: "botsort.yaml",
        translate: 0.1, val: true, verbose: true, vid_stride: 1, visualize: false,
        warmup_bias_lr: 0.1, warmup_epochs: 3.0, warmup_momentum: 0.8,
        weight_decay: 0.0005, workers: 8, workspace: null
    };

    function loadConfig() {
        try {
            const raw = localStorage.getItem(DEFAULT_CONFIG_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore parse errors */ }
        return JSON.parse(JSON.stringify(defaultConfig));
    }
    function saveConfig(obj) {
        try {
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
            document.getElementById('start-training-btn')?.addEventListener('click', startTraining);
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
                // show editor with current config JSON
                configTextarea.value = JSON.stringify(currentCfg, null, 2);
                configError.classList.add('hidden');
                configEditorWrap.classList.remove('hidden');
                configTextarea.focus();
                window.scrollTo({ top: configEditorWrap.offsetTop - 40, behavior: 'smooth' });
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
        }

        if (page === 'predicao') {
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
                const items = await window.API.getModels();
                let stored = [];
                try { stored = JSON.parse(localStorage.getItem('selected_models') || '[]'); } catch (e) { stored = []; }
                const defaultAll = stored.length === 0;
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
                saveSelectionFromContainer();
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
                    const suggested = './app/storage/datasets_yolo/CM/01';
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

        if (page === 'historico') {
            // populate runs select
            const runsSelect = document.getElementById('history-run-select');
            const loadBtn = document.getElementById('load-run-btn');
            const resultsContainer = document.getElementById('history-results');

            async function populateRuns() {
                if (!runsSelect) return;
                runsSelect.innerHTML = '<option>Carregando...</option>';
                const runs = await window.API.getPredictionsList();
                if (!runs || runs.length === 0) {
                    runsSelect.innerHTML = '<option value="">Nenhuma predição encontrada</option>';
                    return;
                }
                runsSelect.innerHTML = runs.map(r => `<option value="${r}">${r}</option>`).join('');
            }

            async function loadSelectedRun() {
                if (!runsSelect || !resultsContainer) return;
                const run = runsSelect.value;
                if (!run) return;
                resultsContainer.innerHTML = '';
                showLog(`Carregando predição: ${run}`);
                // list model subfolders for the selected run
                const models = await window.API.listModelsInRun(run);
                if (!models || models.length === 0) {
                    resultsContainer.innerHTML = `<div class="card">Nenhum modelo encontrado em ${run}</div>`;
                    return;
                }
                // for each model, fetch images using Finder with lastDir override
                for (const m of models) {
                    const modelDiv = document.createElement('div');
                    modelDiv.className = 'model-result';
                    modelDiv.innerHTML = `<h4 style="margin-bottom:6px;font-weight:700">${m}</h4>`;
                    let images = await window.Finder.findImagesForModel(m, { lastDir: run });
                    if (!images || images.length === 0) images = Array.from({ length: 2 }).map((_, i) => `https://via.placeholder.com/300?text=${encodeURIComponent(m)}+${i + 1}`);
                    const imgsHtml = images.map(url => `<div class="card image-card"><img src="${url}" alt="${m}" /></div>`).join('');
                    modelDiv.innerHTML += `<div class="model-images">${imgsHtml}</div>`;
                    resultsContainer.appendChild(modelDiv);
                }
                showLog(`Predição ${run} carregada. Modelos: ${models.join(', ')}`);
            }

            // wire buttons
            populateRuns();
            if (loadBtn) loadBtn.addEventListener('click', loadSelectedRun);
            // also update when selecting a run
            if (runsSelect) runsSelect.addEventListener('change', () => { /* optionally auto-load */ });
        }
    }

    async function startTraining() {
        const btn = document.getElementById('start-training-btn');
        if (btn) btn.disabled = true;
        const payload = {
            dataset: document.getElementById('dataset-select')?.value ?? 'animals',
            hyperparams: { epochs: Number(document.getElementById('epochs')?.value ?? 100), batch: Number(document.getElementById('batch')?.value ?? 16) },
            save_checkpoints: !!document.getElementById('save-checkpoints')?.checked,
            exp_name: document.getElementById('exp-name')?.value || `exp-${Date.now()}`
        };
        showLog('Enfileirando treino: ' + payload.exp_name);
        const res = await window.API.safeFetch(`${window.API.API_BASE}/train/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res) showLog('Job queued: ' + (res.job_id || 'unknown')); else showLog('Job queued (mock).');
        if (btn) btn.disabled = false;
    }

    // ✅ Atualizado: Layout em grid 2x2 para imagens
    async function runPrediction() {
        let selected = [];
        try { selected = JSON.parse(localStorage.getItem('selected_models') || '[]'); } catch (e) { selected = []; }
        if (!selected || selected.length === 0) { showLog('Nenhum modelo selecionado'); return; }

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

        const container = document.getElementById('prediction-results');
        if (!container) return;
        container.innerHTML = '';

        for (const model of selected) {
            const modelDiv = document.createElement('div');
            modelDiv.className = 'model-result';
            modelDiv.innerHTML = `<h4 style="margin-bottom:6px;font-weight:700">${model}</h4>`;
            let images = [];

            if (res?.results_summary?.[model]?.images) images = res.results_summary[model].images;
            if (!images || images.length === 0) images = await window.Finder.findImagesForModel(model);
            if (!images || images.length === 0) images = Array.from({ length: 2 }).map((_, i) => `https://via.placeholder.com/150?text=${encodeURIComponent(model)}+${i + 1}`);

            // 👉 Agora sem estilos inline — o CSS define o grid
            const imgsHtml = images.map(url => `
                <div class="card image-card">
                    <img src="${url}" alt="${model}" />
                </div>
            `).join('');

            modelDiv.innerHTML += `<div class="model-images">${imgsHtml}</div>`;
            container.appendChild(modelDiv);
        }

        showLog(`Predição concluída. Modelos avaliados: ${selected.join(', ')}`);
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
        const imgEl = e.target.closest && e.target.closest('.model-images img');
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
            document.getElementById('sidebar')?.querySelector('.toggle-btn')?.addEventListener('click', toggleSidebar);
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
        navigate
    };
})(window);
