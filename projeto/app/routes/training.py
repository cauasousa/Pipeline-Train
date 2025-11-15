from flask import Blueprint, request, jsonify
from pydantic import BaseModel
from typing import Optional, List

bp = Blueprint("training", __name__)

class TrainPayload(BaseModel):
    dataset: str
    modelo_base: Optional[str] = None
    hyperparams: Optional[dict] = {}
    preprocess_list: Optional[List[str]] = []
    save_checkpoints: Optional[bool] = False
    exp_name: Optional[str] = None

@bp.route("/start", methods=["POST"])
def start_train():
    payload = request.get_json() or {}
    # implementar enfileiramento real se desejar
    return jsonify({"status": "queued", "job_id": "placeholder-job-id"}), 201

@bp.route("/jobs/<job_id>", methods=["GET"])
def get_job(job_id):
    pass
    return {"job_id": job_id, "status": "placeholder", "logs": []}
