import shutil
from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import logging
from pathlib import Path
import random

from datetime import datetime

router = APIRouter()
log = logging.getLogger(__name__)

class PredictPayload(BaseModel):
    models: List[str]
    source: str  # e.g., "val", "upload", "folder"
    preprocessors: Optional[List[str]] = []
    options: Optional[dict] = {}

@router.post("/run")
async def run_predict(payload: PredictPayload = Body(...)):
    """
    Recebe payload com lista de modelos (nomes ou paths) e um options.path opcional.
    Resolve modelos na pasta storage/models_yolo quando necessário e chama function_test_yolo.
    Retorna resumo com modelos avaliados e modelos faltantes.
    """
    # validação básica
    if not payload or not payload.models or not isinstance(payload.models, list):
        raise HTTPException(status_code=400, detail="Payload inválido: 'models' é obrigatório e deve ser lista.")

    # base de modelos na pasta app/storage/models_yolo
    base = Path(__file__).resolve().parent.parent / "storage" / "models_yolo"
    base = base.resolve()
    model_paths = []
    missing = []

    for m in payload.models:
        if not isinstance(m, str) or not m.strip():
            missing.append(str(m))
            continue
        m_str = m.strip()
        # se for path absoluto existente, usa direto
        p = Path(m_str)
        if p.is_absolute() and p.is_file():
            model_paths.append(str(p))
            continue
        # se for nome relativo dentro da pasta models_yolo
        candidate = base / m_str
        if candidate.is_file():
            model_paths.append(str(candidate))
            continue
        # procurar arquivo que contenha o nome informado
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
        raise HTTPException(status_code=400, detail=f"Nenhum modelo válido encontrado. Missing: {missing}")

    # dataset/path (opcional)
    dataset_path = None
    if payload.options and isinstance(payload.options, dict):
        dataset_path = payload.options.get("path")

    # try to import and run real evaluator; if ultralytics is missing, return mock results
    try:
        # lazy import the real runner
        from .train_models import function_test_yolo
        try:
            # Cria timestamp no formato YYYYMMDD_HHMMSS
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Define pasta de saída DENTRO da pasta servida "predictions"
            predictions_base = Path.cwd() / "predictions"
            predictions_base.mkdir(parents=True, exist_ok=True)
            output_path = predictions_base / f"predicao_{timestamp}"
            # Remove se existir (geralmente não vai existir)
            if output_path.exists():
                shutil.rmtree(output_path)
            output_path.mkdir(parents=True, exist_ok=True)

            results = function_test_yolo(
                model_paths=model_paths,
                dataset_path=dataset_path,
                split="val",
                project_name="predicao",
                output_dir=str(output_path)
            )
        except Exception as e:
            log.exception("Erro ao executar function_test_yolo")
            raise HTTPException(status_code=500, detail=f"Erro interno ao executar avaliação: {e}") from e

        evaluated = [os.path.basename(p) for p in model_paths]
        results_summary = {k: (type(v).__name__) for k, v in (results or {}).items()}
        return {
            "status": "completed",
            "evaluated": evaluated,
            "missing": missing,
            "results_summary": results_summary
        }

    except ModuleNotFoundError as me:
        # ultralytics (ou dependência dentro de train_models) não está instalada
        log.warning("ultralytics não disponível - retornando resultados MOCK. Detalhe: %s", me)
        # construir resposta mock simples para frontend
        evaluated = [os.path.basename(p) for p in model_paths]
        mock_results = {}
        for name in evaluated:
            mock_results[name] = {
                "mock": True,
                "accuracy": round(random.uniform(0.75, 0.95), 4),
                "notes": "Resultado simulado. Instale 'ultralytics' no backend para avaliação real."
            }
        return {
            "status": "mocked",
            "evaluated": evaluated,
            "missing": missing,
            "results_summary": mock_results
        }

    except Exception as e:
        log.exception("Erro inesperado ao processar /predict/run")
        raise HTTPException(status_code=500, detail=f"Erro interno inesperado: {e}") from e

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
