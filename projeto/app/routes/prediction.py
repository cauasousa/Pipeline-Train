import os
import shutil
import logging
import random
from pathlib import Path
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask import current_app as app

log = logging.getLogger(__name__)
bp = Blueprint("predict", __name__)

@bp.route("/run", methods=["POST"])
def run_predict():
    payload = request.get_json() or {}
    models = payload.get("models", [])
    if not models or not isinstance(models, list):
        return jsonify({"detail": "Payload inválido: 'models' é obrigatório e deve ser lista."}), 400

    base = Path(__file__).resolve().parent.parent / "storage" / "models_yolo"
    base = base.resolve()
    model_paths = []
    missing = []

    for m in models:
        if not isinstance(m, str) or not m.strip():
            missing.append(str(m))
            continue
        m_str = m.strip()
        p = Path(m_str)
        if p.is_absolute() and p.is_file():
            model_paths.append(str(p))
            continue
        candidate = base / m_str
        if candidate.is_file():
            model_paths.append(str(candidate))
            continue
        found = None
        if base.exists() and base.is_dir():
            for f in os.listdir(base):
                if m_str == f or m_str in f:
                    fp = base / f
                    if fp.is_file():
                        found = fp
                        break
        if found:
            model_paths.append(str(found))
        else:
            missing.append(m_str)

    if not model_paths:
        return jsonify({"detail": f"Nenhum modelo válido encontrado. Missing: {missing}"}), 400

    dataset_path = None
    options = payload.get("options") or {}
    if isinstance(options, dict):
        dataset_path = options.get("path")

    # fallback para path de dataset padrão caso frontend não envie (evita dataset None)
    if not dataset_path:
        dataset_path = str((Path(__file__).resolve().parent.parent / "storage" / "datasets_yolo" / "CM" / "01").resolve())

    try:
        # prefer local implementation (projeto/app/routes/train_models.py)
        try:
            from .train_models import function_test_yolo
        except Exception:
            # fallback to older path if present in repo layout
            from backend.app.routes.train_models import function_test_yolo

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        predictions_base = Path.cwd() / "predictions"
        predictions_base.mkdir(parents=True, exist_ok=True)
        output_path = predictions_base / f"predicao_{timestamp}"
        if output_path.exists():
            shutil.rmtree(output_path)
        output_path.mkdir(parents=True, exist_ok=True)
        print('=-='*30)
        print(f"dataset_path: {dataset_path}")
        print(f"model_paths: {model_paths}")
        print(f"output_path: {output_path}")

        results = function_test_yolo(
            model_paths=model_paths,
            dataset_path=dataset_path,
            split="val",
            project_name="predicao",
            output_dir=str(output_path)
        )

        evaluated = [os.path.basename(p) for p in model_paths]
        results_summary = {k: (type(v).__name__) for k, v in (results or {}).items()}
        return jsonify({
            "status": "completed",
            "evaluated": evaluated,
            "missing": missing,
            "results_summary": results_summary
        })

    except ModuleNotFoundError as me:
        log.warning("ultralytics não disponível - retornando MOCK. Detalhe: %s", me)
        evaluated = [os.path.basename(p) for p in model_paths]
        mock_results = {}
        for name in evaluated:
            mock_results[name] = {
                "mock": True,
                "accuracy": round(random.uniform(0.75, 0.95), 4),
                "notes": "Resultado simulado. Instale 'ultralytics' no backend para avaliação real."
            }
        return jsonify({
            "status": "mocked",
            "evaluated": evaluated,
            "missing": missing,
            "results_summary": mock_results
        })

    except Exception as e:
        log.exception("Erro inesperado ao processar /predict/run")
        return jsonify({"detail": f"Erro interno inesperado: {e}"}), 500

# # New endpoint: lista modelos disponíveis em storage/models_yolo
# @router.get("/models")
# async def list_models():
#     base = os.path.join(os.getcwd(), "storage", "models_yolo")
#     models = []
#     print("CHAMOU!")
#     if os.path.exists(base) and os.path.isdir(base):
#         try:
#             for f in sorted(os.listdir(base)):
#                 path = os.path.join(base, f)
                
#                 if os.path.isfile(path):
#                     models.append(f)
#         except Exception:
#             # em caso de erro devolve lista vazia
#             models = []
#     return {"models": models}
