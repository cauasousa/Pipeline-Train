from fastapi import APIRouter

router = APIRouter()

@router.get("/model/{model_id}")
async def get_metrics(model_id: str):
    pass
    return {"model_id": model_id, "metrics": {}}
