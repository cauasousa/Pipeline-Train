# Pipeline YOLO — MVP (Local + Docker)

Resumo rápido
- MVP local com frontend estático e backend FastAPI (endpoints stub).
- Objetivo: desenvolver UI e integrações; execução real via Google Colab/worker depois.

Quick Start (recomendado: Docker)
1. Abra o Docker Desktop e aguarde "Docker is running".
2. Abra um terminal e vá para a raiz do projeto:
   cd C:\Users\CauaS\programacao\Mestrado\pipeline_train
3. Suba containers:
   docker compose up --build
4. Acesse:
   - Frontend: http://localhost:3000
   - Backend (OpenAPI): http://localhost:8000/docs

Quick Start (sem Docker)
- Backend (dev):
  cd backend
  python -m venv .venv
  .\.venv\Scripts\activate    # Windows PowerShell
  pip install -r requirements.txt
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

- Frontend (estático, servir pasta correta):
  # opção A (a partir da raiz)
  python -m http.server 3000 --directory frontend/public --bind 127.0.0.1
  # opção B (entrando na pasta)
  cd frontend/public
  python -m http.server 3000 --bind 127.0.0.1
  Abra: http://localhost:3000

Principais endpoints (placeholders)
- POST /train/start  → enfileira treino (retorna job_id placeholder)
- GET  /train/jobs/{job_id} → status/logs (placeholder)
- POST /predict/run  → dispara predição (placeholder)
- GET  /metrics/model/{model_id} → retorna métricas (mock/placeholder)
- GET  /history/list → lista experimentos (placeholder)

Problemas comuns & soluções rápidas

1) Erro Docker: "open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified."
- Causa: Docker daemon não acessível (Docker Desktop não iniciado) ou ambiente WSL2 desalinhado.
- Verificações:
  docker --version
  docker compose version
  docker info   # se falhar, daemon não está rodando
- Solução:
  - Abra Docker Desktop e aguarde.
  - Reinicie Docker Desktop / Windows se necessário.
  - Execute docker compose a partir da raiz do projeto (onde está docker-compose.yml):
    cd C:\Users\CauaS\programacao\Mestrado\pipeline_train
    docker compose up --build
  - Alternativa (de qualquer pasta):
    docker compose -f C:\Users\CauaS\programacao\Mestrado\pipeline_train\docker-compose.yml up --build

2) Erro python -m http.server PermissionError (WinError 10013)
- Sintoma: ao executar `python -m http.server 3000` recebe PermissionError bind/soquete.
- Causas/soluções rápidas:
  - Porta 3000 já em uso → verifique com: netstat -ano | findstr :3000
    - Se estiver em uso, escolha outra porta: python -m http.server 8080 --directory frontend/public
  - Firewall / antivírus bloqueando bind → teste com outra porta e/ou execute num terminal em modo administrador.
  - Force bind ao localhost (recomendado): python -m http.server 3000 --directory frontend/public --bind 127.0.0.1
  - Se persistir, reinicie rede/Docker/antivírus ou use a opção Docker/nginx (docker compose).

Dicas rápidas
- Sempre rode o comando de servir frontend apontando a pasta correta (frontend/public).
- Para desenvolvimento ágil com CSS/JS atualizáveis, use `python -m http.server` na pasta frontend/public ou use o container nginx (docker compose).
- Se quiser hot-reload do backend, rode uvicorn com --reload no ambiente local (não em container).

Onde editar / estrutura
- frontend/public/index.html  ← UI (ativo)
- frontend/public/styles.css  ← estilos (ou use Tailwind CDN para prototipagem)
- backend/app/...            ← FastAPI (routers: training.py, prediction.py, metrics.py, history.py)
- docker-compose.yml         ← orquestra frontend + backend

Próximos passos sugeridos
- Se quiser, acrescento um script PowerShell para tentar iniciar o Docker Desktop automaticamente e executar `docker compose` (start-docker-and-run.ps1).
- Posso converter toda a UI para Tailwind classes inline ou para um projeto React + Vite quando desejar.
