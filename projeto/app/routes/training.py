import os
import shutil
import random
import json
import time
import subprocess
import shlex 
import threading
from pathlib import Path
from typing import Optional, List

from pydantic import BaseModel
# Nota: YOLO deve estar instalado globalmente ou no ambiente virtual do Flask
try:
    from ultralytics import YOLO 
except ImportError:
    class YOLO:
        def __init__(self, *args, **kwargs): pass
        def train(self, *args, **kwargs): raise RuntimeError("Ultralytics não está instalado.")

from flask import Response, jsonify, request, Blueprint

# --- CONFIGURAÇÃO DE ESTADO GLOBAL E LOGS ---
bp = Blueprint("training", __name__, url_prefix='/train')

TRAINING_STATE = {
    "is_active": False,
    "job_id": None,
    "process": None, 
    "log_path": None, 
    "status": "idle"
}

LOGS_DIR = Path("./runs/logs").resolve()
LOGS_DIR.mkdir(parents=True, exist_ok=True)

class TrainPayload(BaseModel):
    dataset: str
    modelo_base: Optional[str] = None
    preprocess_list: Optional[List[str]] = []
    save_checkpoints: Optional[bool] = False
    exp_name: Optional[str] = None
    full_config: Optional[dict] = {}


# --- FUNÇÃO DE PREPARAÇÃO DE DADOS (CONF_DATASET) ---
def conf_dataset(dataset_config: dict, dataset_path: str):
    """
    Prepara o dataset localmente: divide o upload do usuário em T/V/T e
    adiciona classes negativas aleatórias (se configurado).
    Retorna o caminho POSIX para o diretório de saída.
    """
    
    if not dataset_path or dataset_path.strip() == "":
        raise ValueError("dataset_path está vazio ou null")

    dataset_path = Path(dataset_path)

    if not dataset_path.exists():
        # Lembre-se: dataset_path vem do frontend, e precisa existir.
        raise FileNotFoundError(f"Pasta do dataset de upload não encontrada: {dataset_path}")

    upload_folder_name = dataset_path.name
    
    # Define o caminho de saída do dataset customizado (onde as imagens serão copiadas)
    base_output = Path(r"M:\Mestrado\pipeline_train\custom\datasets_custom")
    output_root = base_output / f"dataset_{upload_folder_name}"
    
    # Limpa a pasta de destino (importante para evitar mix de runs)
    if output_root.exists():
         try:
             shutil.rmtree(output_root)
         except Exception as e:
              print(f"ATENÇÃO: Não foi possível limpar o diretório {output_root}. Ignorando. Erro: {e}")

    # Cria o diretório raiz do dataset customizado
    output_root.mkdir(parents=True, exist_ok=True)

    folders = {
        "train": output_root / "train",
        "val": output_root / "val",
        "test": output_root / "test"
    }
    
    # 1. Cria as pastas TRAIN, VAL, TEST
    for part in folders.values():
        part.mkdir(parents=True, exist_ok=True)

    # Variáveis de configuração
    types_to_include = dataset_config.get("types_to_include", [])
    IMG_EXT = [".jpg", ".png", ".jpeg", ".bmp", ".tiff"]
    class_name_positive = upload_folder_name

    # ---------------------------------------
    # 2. PROCESSO DE CLASSE POSITIVA (UPLOAD DO USUÁRIO)
    # ---------------------------------------
    
    train_pct = dataset_config["train_percent"]
    val_pct = dataset_config["val_percent"]
    test_pct = dataset_config["test_percent"]
    
    # 2a. Cria e preenche a pasta da CLASSE POSITIVA
    for part in folders.values():
        (part / class_name_positive).mkdir(parents=True, exist_ok=True)

    images = [
        f for f in dataset_path.iterdir()
        if f.suffix.lower() in IMG_EXT
    ]
    random.shuffle(images)

    total = len(images)
    train_n = int(total * train_pct / 100)
    val_n = int(total * val_pct / 100)
    test_n = total - train_n - val_n

    # Copia imagens da classe positiva
    for img in images[:train_n]:
        shutil.copy(img, folders["train"] / class_name_positive / img.name)
    for img in images[train_n:train_n + val_n]:
        shutil.copy(img, folders["val"] / class_name_positive / img.name)
    for img in images[train_n + val_n:]:
        shutil.copy(img, folders["test"] / class_name_positive / img.name)

    # ---------------------------------------
    # 3. PROCESSO DE CLASSE NEGATIVA (DADOS FIXOS CM/HE/HI)
    # ---------------------------------------
    if types_to_include:
        print("[INFO] Adicionando imagens negativas para tipos:", dataset_config)
        random_count = dataset_config["random_count"]
        random_split = dataset_config["random_split"]
        
        # Cria a pasta de negativos
        class_name_negative = "negativo"
        for part in folders.values():
            (part / class_name_negative).mkdir(parents=True, exist_ok=True)
            
        # Pontos base fixos para cada tipo (Ajuste o caminho base conforme a estrutura real do seu projeto)
        TYPE_BASE_PATHS = {
            "Cone": Path(r"./projeto/app/storage/imagens_implates/CM"),
            "Hex Externo": Path(r"./projeto/app/storage/imagens_implates/HE"),
            "Hex Interno": Path(r"./projeto/app/storage/imagens_implates/HI")
        }
        # M:\Mestrado\pipeline_train\projeto\app\storage\imagens_implates\HE

        for tipo in types_to_include:
            tipo_path = TYPE_BASE_PATHS.get(tipo)
            if not tipo_path or not tipo_path.exists():
                print(f"[WARNING] Tipo negativo '{tipo}' não encontrado no disco: {tipo_path}")
                continue

            # Coleta todas as imagens de todas as subpastas
            imgs_all = [
                f for f in tipo_path.rglob("*")
                if f.suffix.lower() in IMG_EXT
            ]

            if not imgs_all:
                continue

            # Seleciona N imagens aleatórias (random_count)
            imgs_to_copy = random.sample(imgs_all, min(len(imgs_all), random_count))

            # SPLIT POR LINHA DE NEGATIVO
            total_neg = len(imgs_to_copy)
            train_n_neg = int(total_neg * random_split["train"] / 100)
            val_n_neg = int(total_neg * random_split["val"] / 100)
            test_n_neg = total_neg - train_n_neg - val_n_neg
            
            idx_start = 0
            
            # Copiar treino
            for img in imgs_to_copy[idx_start: idx_start + train_n_neg]:
                # Cria um nome único para evitar colisões entre tipos (CM_linha_img.jpg)
                unique_name = f"{tipo[:3]}_{img.parent.name}_{img.name}"
                shutil.copy(img, folders["train"] / class_name_negative / unique_name)
            idx_start += train_n_neg

            # Copiar validação
            for img in imgs_to_copy[idx_start: idx_start + val_n_neg]:
                unique_name = f"{tipo[:3]}_{img.parent.name}_{img.name}"
                shutil.copy(img, folders["val"] / class_name_negative / unique_name)
            idx_start += val_n_neg

            # Copiar teste
            for img in imgs_to_copy[idx_start:]:
                unique_name = f"{tipo[:3]}_{img.parent.name}_{img.name}"
                shutil.copy(img, folders["test"] / class_name_negative / unique_name)

    # RETORNA O CAMINHO NORMALIZADO (POSIX)
    return str(output_root).replace('\\', '/')


# --- FUNÇÃO DE TREINAMENTO EM PROCESSO SEPARADO (CLEAN) ---
def run_training_job_process(job_id, config):
    # ... (Seu código run_training_job_process, inalterado) ...
    global TRAINING_STATE

    log_file_path = TRAINING_STATE["log_path"]
    
    # 1. Constrói o comando YOLO CLI
    # Argumentos passados diretamente para a CLI do YOLO (Ex: yolo classify train project=... epochs=...)
    yolo_args = [
        f"{k}={shlex.quote(str(v))}" 
        for k, v in config.items() 
        if k not in ['mode', 'task']
    ]
    
    command = ["yolo", config.get('task', 'classify'), config.get('mode', 'train')] + yolo_args
    command_str = " ".join(command)

    log_file_handle = None

    try:
        log_file_handle = open(log_file_path, 'w', encoding='utf-8') # FORÇA UTF-8 para escrita
            
        log_file_handle.write(f"--- COMANDO INICIADO ---\n{command_str}\n------------------------\n")
        log_file_handle.flush()
            
        process = subprocess.Popen(
            command_str, 
            shell=True,
            stdout=log_file_handle, 
            stderr=subprocess.STDOUT,
            cwd=Path.cwd()
        )
            
        TRAINING_STATE["process"] = process
        TRAINING_STATE["status"] = "running"

        return_code = process.wait() 

        if TRAINING_STATE["status"] == "running": 
            if return_code == 0:
                TRAINING_STATE["status"] = "complete"
                log_file_handle.write("\n\n--- TREINAMENTO_COMPLETO ---\n")
            else:
                TRAINING_STATE["status"] = "error"
                log_file_handle.write(f"\n\n--- ERRO_TREINAMENTO: Processo encerrado com código {return_code} ---\n")
            log_file_handle.flush()
                
    except Exception as e:
        TRAINING_STATE["status"] = "error"
        if log_file_handle:
            log_file_handle.write(f"\nERRO FATAL: Exceção na Thread Flask: {str(e)}\n")
        
    finally:
        TRAINING_STATE["is_active"] = False
        TRAINING_STATE["job_id"] = None
        TRAINING_STATE["process"] = None
        TRAINING_STATE["log_path"] = None
        if log_file_handle:
             log_file_handle.close()


# --- ROTAS DE ESTADO E CONTROLE ---
# (As rotas /status, /cancel, /start, /logs, /upload-folder, /datasets permanecem inalteradas
# conforme o último código que você forneceu, garantindo que as chamadas a conf_dataset e 
# run_training_job_process estão corretas.)

@bp.route("/status", methods=["GET"])
def get_training_status():
    global TRAINING_STATE
    if TRAINING_STATE["is_active"] and TRAINING_STATE["process"] and TRAINING_STATE["process"].poll() is not None:
         TRAINING_STATE["is_active"] = False
    return jsonify({
        "is_active": TRAINING_STATE["is_active"],
        "job_id": TRAINING_STATE["job_id"],
        "status": TRAINING_STATE["status"]
    })

@bp.route("/cancel", methods=["POST"])
def cancel_train():
    global TRAINING_STATE
    if not TRAINING_STATE["is_active"] or not TRAINING_STATE["process"]:
        return jsonify({"status": "not_running", "message": "Nenhum treinamento ativo para cancelar."}), 409
    
    process = TRAINING_STATE["process"]
    job_id = TRAINING_STATE["job_id"]
    log_file_path = TRAINING_STATE["log_path"]
    TRAINING_STATE["status"] = "cancelled" 
    
    try:
        process.terminate()
        process.wait(timeout=10)
        
        if process.poll() is None:
            process.kill()
            process.wait()
            
        with open(log_file_path, 'a') as f:
            f.write("\n\n--- TREINAMENTO CANCELADO PELO USUÁRIO ---\n")
            f.flush()
        
        return jsonify({"status": "cancelled", "job_id": job_id, "message": "Treinamento cancelado com sucesso."}), 200

    except Exception as e:
        TRAINING_STATE["is_active"] = False
        return jsonify({"status": "error", "message": f"Erro ao tentar cancelar: {str(e)}"}), 500


@bp.route("/start", methods=["POST"])
def start_train():  
    global TRAINING_STATE
    
    if TRAINING_STATE["is_active"]:
        return jsonify({"status": "error", "message": f"Um treinamento ({TRAINING_STATE['job_id']}) já está em andamento. Cancele-o primeiro."}), 409
        
    payload = request.get_json() or {}
    
    try:
        dataset_path = r'./custom/upload_folder_image/' + payload.get("dataset", "")
        dataset_config = payload.get("dataset_config", {})
        
        dataset_customizations = conf_dataset(dataset_config, dataset_path)
        
        # Garante que o caminho seja POSIX antes de passar para a config
        if isinstance(dataset_customizations, str):
             dataset_customizations = dataset_customizations.replace('\\', '/')
            
        config = payload.get("full_config", {})
        config["data"] = dataset_customizations
        
        invalid_args = [
            'config_version', 'save_dir', 'format', 'source', 'split', 
            'tracker', 'simplify', 'opset', 'device' 
        ]
        for arg in invalid_args:
             if arg in config:
                del config[arg]
        
        if 'task' not in config: config['task'] = 'classify'
        if 'mode' not in config: config['mode'] = 'train'
        
        job_id = payload.get("exp_name", f"exp-{int(time.time() * 1000)}")
        config['name'] = job_id
        
        log_file = LOGS_DIR / f"{job_id}.log"
        TRAINING_STATE["is_active"] = True
        TRAINING_STATE["job_id"] = job_id
        TRAINING_STATE["log_path"] = log_file
        TRAINING_STATE["status"] = "starting"
        
        thread = threading.Thread(target=run_training_job_process, args=(job_id, config))
        thread.daemon = True
        thread.start()

        return jsonify({
            "status": "training_started_async",
            "job_id": job_id,
            "message": "Treinamento iniciado em segundo plano."
        }), 200

    except Exception as e:
        TRAINING_STATE["is_active"] = False
        TRAINING_STATE["job_id"] = None
        TRAINING_STATE["status"] = "idle"
        
        print(f"[ERROR] Erro ao iniciar treinamento: {e}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@bp.route("/logs/<job_id>", methods=["GET"])
def get_log_file(job_id):
    log_file = LOGS_DIR / f"{job_id}.log"
    if not log_file.exists():
         return Response(f"data: [ERRO] Arquivo de log não encontrado: {log_file}\n\n", mimetype="text/event-stream")

    def generate():
        try:
            # Tenta usar latin-1 para máxima compatibilidade com saída de console
            with open(log_file, 'r', encoding='latin-1') as f:
                # posiciona no final do arquivo para seguir por novas linhas
                f.seek(0, 2)

                while True:
                    line = f.readline()

                    if not line:
                        time.sleep(0.1)
                        # quando o job não está mais ativo e não é o mesmo job_id, finalize
                        if not TRAINING_STATE["is_active"] and TRAINING_STATE["job_id"] != job_id:
                            # leia qualquer linha residual antes de encerrar
                            final_line = f.readline()
                            if final_line:
                                # garante que termine com dupla quebra de linha para completar o evento SSE
                                yield f"data: {final_line.rstrip()}\n\n"
                            yield "data: [INFO] Fim da conexão de log.\n\n"
                            break
                        continue

                    # Para cada linha nova, envie um evento SSE corretamente terminado por uma linha em branco
                    try:
                        yield f"data: {line.rstrip()}\n\n"
                    except Exception:
                        # fallback simples caso haja caracteres estranhos
                        yield f"data: {line.encode('utf-8', errors='replace')}\n\n"

        except Exception as e:
            yield f"data: [ERRO NO STREAM] {str(e)}\n\n"

        # caso o servidor ainda refira este job_id, notifique encerramento do stream
        if TRAINING_STATE["job_id"] == job_id:
            yield "data: [INFO] Stream encerrado pelo servidor.\n\n"
        
    # Add no-cache and disable proxy buffering where possible to improve real-time delivery
    headers = {
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'
    }
    return Response(generate(), mimetype="text/event-stream", headers=headers)


@bp.route("/jobs/<job_id>", methods=["GET"])
def get_job(job_id):
    pass
    return {"job_id": job_id, "status": "placeholder", "logs": []}


@bp.route('/upload-folder', methods=['POST'])
def upload_folder():
    import os
    from werkzeug.utils import secure_filename

    base_dir = os.path.abspath(os.path.join(os.getcwd(), 'custom', 'upload_folder_image', 'uploads'))
    os.makedirs(base_dir, exist_ok=True)

    files = request.files.getlist('files')
    saved = 0
    errors = []
    print("STARTING UPLOAD...")
    for f in files:
        filename = getattr(f, 'filename', None) or ''
        rel = filename.replace('\\', '/').lstrip('/')
        parts = [p for p in rel.split('/') if p and p != '..']
        if not parts:
            fname = secure_filename(filename) or 'file'
            target = os.path.join(base_dir, fname)
        else:
            safe_parts = [secure_filename(p) for p in parts]
            target = os.path.join(base_dir, *safe_parts)
        try:
            os.makedirs(os.path.dirname(target), exist_ok=True)
            f.save(target)
            saved += 1
        except Exception as e:
            print(f"[ERROR] Could not save uploaded file to {target}: {e}")
            errors.append({'file': filename, 'error': str(e)})
    print("FINASHED")
    return jsonify({'status': 'ok', 'saved': saved, 'errors': errors}), (200 if not errors else 207)


@bp.route('/datasets', methods=['GET'])
def list_uploaded_datasets():
    import os
    base_root = os.path.abspath(os.path.join(os.getcwd(), 'custom', 'upload_folder_image'))
    alt_root = os.path.join(base_root, 'AQUI')
    dirs_found = set()

    def scan_root(root):
        if not os.path.isdir(root):
            return
        for dirpath, dirnames, filenames in os.walk(root):
            if filenames:
                rel = os.path.relpath(dirpath, base_root)
                rel = rel.replace('\\', '/')
                if rel == '.':
                    continue
                dirs_found.add(rel)

    scan_root(base_root)
    scan_root(alt_root)

    results = sorted(dirs_found)
    return jsonify({'datasets': results})