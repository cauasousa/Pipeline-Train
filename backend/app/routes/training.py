from fastapi import APIRouter, Body
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class TrainPayload(BaseModel):
    dataset: str
    modelo_base: Optional[str] = None
    hyperparams: Optional[dict] = {}
    preprocess_list: Optional[List[str]] = []
    save_checkpoints: Optional[bool] = False
    exp_name: Optional[str] = None

@router.post("/start")
async def start_train(payload: TrainPayload = Body(...)):
    pass
    return {"status": "queued", "job_id": "placeholder-job-id"}

@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    pass
    return {"job_id": job_id, "status": "placeholder", "logs": []}
