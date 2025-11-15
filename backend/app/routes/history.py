from fastapi import APIRouter

router = APIRouter()

@router.get("/list")
async def list_experiments():
    pass
    return {"experiments": []}

@router.post("/retrain/{exp_id}")
async def retrain_experiment(exp_id: str):
    pass
    return {"status": "requeued", "exp_id": exp_id}
