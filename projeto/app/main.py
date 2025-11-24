from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from .routes import training, prediction, metrics, history
import os

app = FastAPI(title="YOLO Classification API (MVP)")

from pathlib import Path

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(training.router, prefix="/train", tags=["train"])
app.include_router(prediction.router, prefix="/predict", tags=["predict"])
app.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
app.include_router(history.router, prefix="/history", tags=["history"])

from fastapi.staticfiles import StaticFiles
import os

# --- SEU ENDPOINT AQUI ---
@app.get("/predictions/last_dir")
async def last_prediction_dir():
    base = Path.cwd() / "predictions"
    if not base.exists() or not base.is_dir():
        return {"last_dir": None, "subdirs": [], "full_paths": {}}

    dirs = sorted(
        [d for d in base.iterdir() if d.is_dir() and d.name.startswith("predicao_")],
        key=lambda x: x.stat().st_mtime,
        reverse=True
    )
    if not dirs:
        return {"last_dir": None, "subdirs": [], "full_paths": {}}

    last_dir = dirs[0]
    subdirs = [d.name for d in last_dir.iterdir() if d.is_dir()]
    full_paths = {d.name: str(d) for d in last_dir.iterdir() if d.is_dir()}
    return {"last_dir": last_dir.name, "subdirs": subdirs, "full_paths": full_paths}

predictions_dir = os.path.join(os.path.dirname(__file__), "../predictions")
os.makedirs(predictions_dir, exist_ok=True)  # ✅ garante que o diretório exista

app.mount("/predictions", StaticFiles(directory=predictions_dir), name="predictions")

@app.get("/")
async def root():
    return {"message": "Bem-vindo à API de Classificação YOLO (MVP)"}

# New endpoint: list all timestamped prediction runs (folder names)
@app.get("/predictions/runs", tags=["predictions"])
async def list_prediction_runs():
    """
    Returns a JSON array of timestamped prediction folders found under the project's 'predictions' directory.
    Example response: ["predicao_20251110_164109", "predicao_20251110_164918", ...]
    """
    # determine project-level predictions folder (works both on Windows dev and Docker /app)
    project_root = Path(__file__).resolve().parents[2]
    preds = (project_root / "predictions").resolve()
    if not preds.exists() or not preds.is_dir():
        return {"runs": []}
    runs = []
    try:
        for d in preds.iterdir():
            if d.is_dir() and d.name.startswith("predicao_"):
                runs.append((d.name, d.stat().st_mtime))
    except Exception:
        return {"runs": []}
    # sort by mtime desc and return names
    runs_sorted = [name for (name, _) in sorted(runs, key=lambda t: t[1], reverse=True)]
    return {"runs": runs_sorted}

# New endpoint: list model subfolders inside a given run
@app.get("/predictions/{run_name}/models", tags=["predictions"])
async def list_models_in_run(run_name: str):
    """
    Returns model subfolder names located under predictions/<run_name>/
    Example response: ["01_best", "fabricante-1", "fabricante-2"]
    """
    project_root = Path(__file__).resolve().parents[2]
    run_dir = (project_root / "predictions" / run_name).resolve()
    if not run_dir.exists() or not run_dir.is_dir():
        return {"models": []}
    models = []
    try:
        for p in run_dir.iterdir():
            if p.is_dir():
                models.append(p.name)
    except Exception:
        return {"models": []}
    return {"models": sorted(models)}