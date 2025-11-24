import threading
from pyngrok import ngrok
import time
import os

# --- INÍCIO DA CORREÇÃO DE IMPORTAÇÃO ---
# Importa a instância 'app' do seu arquivo 'app.py' (a variável correta é 'app')
try:
    from app import app
except ImportError as e:
    print(f"❌ Erro grave ao importar 'app': {e}")
    print("Verifique se o seu arquivo 'app.py' está no diretório atual e sem erros de sintaxe.")
    raise e
# --- FIM DA CORREÇÃO DE IMPORTAÇÃO ---

# 1. Configuração da Porta
PORT = 8000 

# 2. Função para rodar o Flask
def run_flask_app():
    print(f"✅ Flask: Iniciando servidor na porta {PORT}...")
    # O host '0.0.0.0' é necessário para expor a porta ao ngrok
    app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)

# 3. Inicia o Flask em um Thread
print("🚀 Iniciando servidor Flask em segundo plano...")
flask_thread = threading.Thread(target=run_flask_app)
flask_thread.start()

# 4. Inicia o Túnel ngrok
# Espera um pouco para garantir que o Flask tenha tempo de iniciar
time.sleep(5) 
print(f"🔗 Ngrok: Abrindo túnel público para a porta {PORT}...")

try:
    # Cria o túnel e obtém a URL pública
    public_url = ngrok.connect(PORT)
    
    print("\n" + "="*60)
    print(f"🎉 Aplicação FLASK + FRONTEND Rodando em:")
    print(f"👉 {public_url}")
    print("="*60 + "\n")
    
    # Mantém esta célula rodando para manter o túnel e o servidor ativos
    while True:
        time.sleep(1)

except Exception as e:
    print(f"\n❌ Erro crítico ao iniciar ngrok: {e}")
    print("Verifique a saída do log do Flask acima para mais detalhes.")