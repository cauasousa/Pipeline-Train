from flask import Blueprint, jsonify

bp = Blueprint("history", __name__)

@bp.route("/list", methods=["GET"])
def list_experiments():
    pass
    return jsonify({"experiments": []})

@bp.route("/retrain/<exp_id>", methods=["POST"])
def retrain_experiment(exp_id):
    pass
    return jsonify({"status": "requeued", "exp_id": exp_id})
