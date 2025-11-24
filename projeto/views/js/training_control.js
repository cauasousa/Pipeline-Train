// training_control.js

// Expõe TrainingControl globalmente para ser acessível pelo UI.js
(function (global) {
    const TrainingControl = {
        jobID: null,
        isTrainingActive: false,
        eventSource: null,
        API_BASE: global.API ? global.API.API_BASE : '',

        init: function () {
            // Garante que só inicializa se estiver na página de treinamento (os elementos existem)
            if (!document.getElementById('training-page')) return;

            this.startBtn = document.getElementById('start-training-btn');
            this.cancelBtn = document.getElementById('cancel-training-btn');
            this.logsElement = document.getElementById('logs');

            // Remove listeners antigos antes de adicionar novos
            this.startBtn.removeEventListener('click', this._startHandler);
            this.cancelBtn.removeEventListener('click', this._cancelHandler);

            this._startHandler = () => this.startTraining();
            this._cancelHandler = () => this.cancelTraining();

            this.startBtn.addEventListener('click', this._startHandler);
            this.cancelBtn.addEventListener('click', this._cancelHandler);

            // 1. Verificar o estado inicial (caso o usuário atualize a página)
            this.checkInitialStatus();
        },

        setUIState: function (active, jobId = null) {
            this.isTrainingActive = active;
            this.jobID = jobId;

            const inputsAndButtons = document.querySelectorAll(
                '#training-page input:not(.config-textarea), #training-page select, #training-page button:not(#cancel-training-btn):not(#edit-config-btn):not(#save-config-btn):not(#cancel-config-btn):not(#reset-config-btn)'
            );

            inputsAndButtons.forEach(el => {
                el.disabled = active;
            });

            // Controles de Edição da Configuração (devem permanecer ativos se não estiver no modo de edição)
            const configBtns = document.querySelectorAll('#edit-config-btn, #reset-config-btn');
            configBtns.forEach(el => { el.disabled = active; });

            // Controles de Treino
            this.startBtn.classList.toggle('hidden', active);
            this.cancelBtn.classList.toggle('hidden', !active);
            this.cancelBtn.disabled = !active;

            // Se estiver ativo, inicia o log stream
            if (active && jobId) {
                this.startLogStream(jobId);
            } else {
                this.stopLogStream();
            }
        },

        checkInitialStatus: async function () {
            try {
                const response = await fetch(`${this.API_BASE}/train/status`);
                const data = await response.json();

                if (data.is_active) {
                    this.logsElement.value += `[INFO] Treinamento ativo detectado: ${data.job_id} (${data.status}). Reconectando ao log...\n`;
                    this.setUIState(true, data.job_id);
                } else {
                    this.setUIState(false);
                }
            } catch (error) {
                console.error('Erro ao verificar status:', error);
                this.logsElement.value += `[ERRO] Falha ao verificar status: ${error.message}\n`;
                this.setUIState(false);
            }
        },

        startTraining: async function () {
            // Verifica se a função de coleta existe no módulo UI
            if (typeof global.UI.collectTrainingPayload !== 'function') {
                this.logsElement.value += "[ERRO] Função de coleta de payload não encontrada.\n";
                return;
            }
            const payload = global.UI.collectTrainingPayload();
            const jobID = payload.exp_name;

            this.logsElement.value = `[INFO] Preparando treinamento... Job ID: ${jobID}\n`;
            this.setUIState(true, jobID);

            try {
                const response = await fetch(`${this.API_BASE}/train/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (response.ok && data.status === 'training_started_async') {
                    this.setUIState(true, data.job_id);
                    // O log inicial foi limpado acima, a mensagem de start já será enviada pelo SSE
                } else {
                    this.logsElement.value += `[ERRO] ${data.message || 'Falha ao iniciar treino'}\n`;
                    this.setUIState(false);
                }
            } catch (error) {
                this.logsElement.value += `[ERRO] Erro de rede/API: ${error.message}\n`;
                this.setUIState(false);
            }
        },

        cancelTraining: async function () {
            if (!this.isTrainingActive || !this.jobID) return;

            this.cancelBtn.disabled = true;
            this.logsElement.value += `[INFO] Enviando pedido de cancelamento para ${this.jobID}...\n`;

            try {
                const response = await fetch(`${this.API_BASE}/train/cancel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });

                const data = await response.json();

                if (response.ok && data.status === 'cancelled') {
                    this.logsElement.value += `[INFO] ${data.message}. Aguardando o encerramento do stream...\n`;
                    // O setUIState(false) será chamado pelo SSE quando o log de cancelamento chegar.
                } else {
                    this.logsElement.value += `[ERRO] Falha ao cancelar: ${data.message || 'Erro desconhecido'}\n`;
                    this.cancelBtn.disabled = false;
                }
            } catch (error) {
                this.logsElement.value += `[ERRO] Erro de rede ao tentar cancelar: ${error.message}\n`;
                this.cancelBtn.disabled = false;
            }
        },

        startLogStream: function (jobId) {
            this.stopLogStream();
            this.eventSource = new EventSource(`${this.API_BASE}/train/logs/${jobId}`);

            this.eventSource.onmessage = (event) => {
                let newLogChunk = event.data || '';
                // normalize: ensure newline at end for textarea readability
                if (newLogChunk && !newLogChunk.endsWith('\n')) newLogChunk = newLogChunk + '\n';
                // Adiciona o novo chunk de log ao final
                this.logsElement.value += newLogChunk;
                // keep view scrolled to bottom
                this.logsElement.scrollTop = this.logsElement.scrollHeight;

                // Verificação de Encerramento (inclui mensagens de sucesso, erro e cancelamento)
                if (newLogChunk.includes("TREINAMENTO_COMPLETO") ||
                    newLogChunk.includes("ERRO_TREINAMENTO") ||
                    newLogChunk.includes("CANCELADO PELO USUÁRIO") ||
                    newLogChunk.includes("Fim da conexão de log")
                ) {
                    this.stopLogStream();
                    this.setUIState(false);
                }
            };

            this.eventSource.onerror = (err) => {
                console.error("EventSource failed:", err);
                this.logsElement.value += '\n[ERROR] Conexão de log interrompida.\n';
                this.stopLogStream();
            };
        },

        stopLogStream: function () {
            if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = null;
            }
        }
    };

    // Expõe no escopo global (window)
    global.TrainingControl = TrainingControl;
})(window);