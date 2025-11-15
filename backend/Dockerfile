FROM python:3.10-slim

WORKDIR /app

# Instala dependências básicas do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements e instala dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia código da aplicação
COPY ./app ./app

# Define variáveis para cache (vai para o volume M:)
ENV TRANSFORMERS_CACHE=/root/.cache/huggingface
ENV HF_HOME=/root/.cache/huggingface
ENV TORCH_HOME=/root/.cache/torch
ENV MPLCONFIGDIR=/root/.cache/matplotlib

EXPOSE 8000

# Usa o comando padrão (igual ao compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
