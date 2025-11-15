from flask import Blueprint, jsonify

bp = Blueprint("metrics", __name__)

@bp.route("/model/<model_id>", methods=["GET"])
def get_metrics(model_id):
    pass
    return jsonify({"model_id": model_id, "metrics": {}})
