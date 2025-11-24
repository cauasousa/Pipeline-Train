Pipeline-Train — como rodar em uma única porta

Rápido:

- Abra PowerShell na pasta do projeto.
-       .\setup_dev.ps1
-       .\.venv\Scripts\Activate.ps1
-       .\run.ps1 8000
-       
-       
- Execute (exemplo porta 8000):

	.\run.ps1 8000

Isto define a variável de ambiente PORT para a sessão e inicia `app.py` (Flask) que serve as rotas e arquivos estáticos a partir de `projeto/views` ou `frontend/build`.

Variáveis de ambiente:

- PORT: porta onde o servidor irá escutar (padrão no script: 8000)

Notas:

- O projeto contém tanto código baseado em Flask (`app.py` e `projeto/app/routes/*.py`) quanto alguns artefatos FastAPI em `projeto/app/main.py`. Atualmente o servidor principal é o Flask (arquivo `app.py`) e foi ajustado para registrar os blueprints em `projeto/app/routes` e servir `projeto/views`.
- Se preferir usar FastAPI/uvicorn, eu posso ajudar a migrar ou a criar uma camada ASGI que reúna tudo numa porta; isso exige converter as blueprints Flask para routers FastAPI ou expor o Flask app via ASGI adaptador.

Como testar rapidamente:

- No PowerShell, após iniciar o servidor, acesse no navegador `http://localhost:8000/`.
- Para checar rota de exemplo (lista de modelos): `http://localhost:8000/models` deve retornar JSON.

Se quiser, eu aplico as mudanças restantes (documentação mais extensa, testes rápidos, ou conversão para FastAPI). 
