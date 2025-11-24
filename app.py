import os
from pathlib import Path
from flask import Flask, send_from_directory, jsonify, abort
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)
# Habilita CORS para rotas API e estáticas
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/predictions/*": {"origins": "*"}, r"/*": {"origins": "*"}})

# Registrar blueprints da pasta `projeto.app.routes` (a implementação atual do projeto)
try:
    from projeto.app.routes import training as training_mod
    from projeto.app.routes import prediction as prediction_mod
    
    app.register_blueprint(training_mod.bp, url_prefix="/train")
    app.register_blueprint(prediction_mod.bp, url_prefix="/predict")
    
except Exception as e:
    # log simples para facilitar debug se a importação falhar
    print("Falha ao importar blueprints de projeto.app.routes:", e)

# Paths
project_root = BASE_DIR
predictions_dir = (project_root / "predictions").resolve()
models_storage_dir = (project_root / "custom" / "models").resolve()

predictions_dir.mkdir(parents=True, exist_ok=True)

# Serve arquivos dentro de predictions
@app.route("/predictions/<path:filename>")
def serve_prediction_file(filename):
    file_path = predictions_dir / filename
    if not file_path.exists():
        abort(404)
    return send_from_directory(str(predictions_dir), filename)

# last prediction dir
@app.route("/predictions/last_dir", methods=["GET"])
def last_prediction_dir():
    base = predictions_dir
    if not base.exists() or not base.is_dir():
        return jsonify({"last_dir": None, "subdirs": [], "full_paths": {}})
    dirs = sorted(
        [d for d in base.iterdir() if d.is_dir() and d.name.startswith("predicao_")],
        key=lambda x: x.stat().st_mtime,
        reverse=True
    )
    if not dirs:
        return jsonify({"last_dir": None, "subdirs": [], "full_paths": {}})
    last_dir = dirs[0]
    subdirs = [d.name for d in last_dir.iterdir() if d.is_dir()]
    full_paths = {d.name: str(d) for d in last_dir.iterdir() if d.is_dir()}
    return jsonify({"last_dir": last_dir.name, "subdirs": subdirs, "full_paths": full_paths})

# list runs
@app.route("/predictions/runs", methods=["GET"])
def list_prediction_runs():
    preds = predictions_dir
    if not preds.exists() or not preds.is_dir():
        return jsonify({"runs": []})
    runs = []
    try:
        for d in preds.iterdir():
            if d.is_dir() and d.name.startswith("predicao_"):
                runs.append((d.name, d.stat().st_mtime))
    except Exception:
        return jsonify({"runs": []})
    runs_sorted = [name for (name, _) in sorted(runs, key=lambda t: t[1], reverse=True)]
    return jsonify({"runs": runs_sorted})

# list models inside run
@app.route("/predictions/<run_name>/models", methods=["GET"])
def list_models_in_run(run_name):
    run_dir = (predictions_dir / run_name).resolve()
    if not run_dir.exists() or not run_dir.is_dir():
        return jsonify({"models": []})
    models = []
    try:
        for p in run_dir.iterdir():
            if p.is_dir():
                models.append(p.name)
    except Exception:
        return jsonify({"models": []})
    return jsonify({"models": sorted(models)})

# list models (from backend storage)
@app.route("/models", methods=["GET"])
def list_models_root():
    base = models_storage_dir
    models = []
    if base.exists():
        try:
            models = [f for f in sorted(os.listdir(base)) if os.path.isfile(os.path.join(base, f))]
        except Exception:
            models = []
    return jsonify({"models": models})

# Serve frontend (build preferred, fallback public)
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    target = path or "index.html"
    # Prioriza as views estáticas em projeto/views
    views_dir = BASE_DIR / "projeto" / "views"
    build_dir = BASE_DIR / "frontend" / "build"
    public_dir = BASE_DIR / "frontend" / "public"

    # 1) Se arquivo existe em projeto/views, servir diretamente
    if views_dir.is_dir() and (views_dir / target).exists():
        return send_from_directory(str(views_dir), target)

    # 2) fallback: frontend/build (se existir)
    if build_dir.is_dir() and (build_dir / target).exists():
        return send_from_directory(str(build_dir), target)
    # 3) fallback: frontend/public
    if public_dir.is_dir() and (public_dir / target).exists():
        return send_from_directory(str(public_dir), target)
    if path.startswith("api") or path.startswith("predict") or path.startswith("train") or path.startswith("metrics") or path.startswith("history"):
        abort(404)
    return ("Frontend files not found. Coloque arquivos estáticos em projeto/views ou frontend/build/public.", 500)

if __name__ == "__main__":
    # Executar localmente em uma porta só (8000)
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), debug=True, threaded=True)
