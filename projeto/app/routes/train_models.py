import os
from pathlib import Path

# ============================================================
# 🔧 Funções para treinar e testar YOLOv11 (Ultralytics)
# ============================================================

def function_train_yolo(
    dataset_path=r"C:\Users\CauaS\programacao\Mestrado\pipeline_train\backend\app\storage\datasets_yolo\CM\01",
    model_name="yolo11n-cls.pt",
    epochs=50,
    imgsz=640,
    batch=16,
    project_name="projeto_yolo"
):
    """
    Treina um modelo YOLOv11 com os parâmetros especificados.
    Se nenhum dataset ou modelo for informado, usa valores padrão.
    """

    # lazy import to avoid ModuleNotFoundError at module import time
    try:
        from ultralytics import YOLO
    except ModuleNotFoundError as e:
        raise ModuleNotFoundError("Package 'ultralytics' is not installed. Install with: pip install ultralytics") from e

    print(f"\n🚀 Iniciando treinamento YOLOv11")
    print(f"📂 Dataset: {dataset_path}")
    print(f"🤖 Modelo base: {model_name}")
    print(f"📊 Épocas: {epochs} | 🖼️ ImgSize: {imgsz} | 📦 Batch: {batch}\n")

    # Verificar se o dataset existe
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"O dataset '{dataset_path}' não foi encontrado!")

    # Criar e treinar o modelo
    model = YOLO(model_name)
    model.train(
        data=dataset_path,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        name=project_name,
    )

    print(f"\n✅ Treinamento concluído! Resultados em 'runs/'\n")
    return model


# agnostic_nms=False, amp=True, augment=False, auto_augment=randaugment, batch=16, bgr=0.0, box=7.5, cache=False, cfg=None, classes=None, close_mosaic=10, cls=0.5, compile=False, conf=None, copy_paste=0.0, copy_paste_mode=flip, cos_lr=False, cutmix=0.0, data=/content/02-3, degrees=0.0, deterministic=True, device=0, dfl=1.5, dnn=False, dropout=0.0, dynamic=False, embed=None, epochs=50, erasing=0.4, exist_ok=False, fliplr=0.5, flipud=0.0, format=torchscript, fraction=1.0, freeze=None, half=False, hsv_h=0.015, hsv_s=0.7, hsv_v=0.4, imgsz=224, int8=False, iou=0.7, keras=False, kobj=1.0, line_width=None, lr0=0.01, lrf=0.01, mask_ratio=4, max_det=300, mixup=0.0, mode=train, model=yolov8n-cls.pt, momentum=0.937, mosaic=1.0, multi_scale=False, name=treinamento_classificacao, nbs=64, nms=False, opset=None, optimize=False, optimizer=auto, overlap_mask=True, patience=100, perspective=0.0, plots=True, pose=12.0, pretrained=True, profile=False, project=/content/drive/MyDrive/yolo_classificacao_resultados, rect=False, resume=False, retina_masks=False, save=True, save_conf=False, save_crop=False, save_dir=/content/drive/MyDrive/yolo_classificacao_resultados/treinamento_classificacao, save_frames=False, save_json=False, save_period=-1, save_txt=False, scale=0.5, seed=0, shear=0.0, show=False, show_boxes=True, show_conf=True, show_labels=True, simplify=True, single_cls=False, source=None, split=val, stream_buffer=False, task=classify, time=None, tracker=botsort.yaml, translate=0.1, val=True, verbose=True, vid_stride=1, visualize=False, warmup_bias_lr=0.1, warmup_epochs=3.0, warmup_momentum=0.8, weight_decay=0.0005, workers=8, workspace=None



import os
import platform

# ============================================================
# 🔧 Funções utilitárias para caminhos dinâmicos
# ============================================================

def get_base_path():
    """
    Retorna o caminho base correto dependendo do ambiente (Windows ou Docker/Linux).
    - No Windows: usa o diretório local do projeto.
    - No Docker: usa o diretório /app.
    """
    # em container Docker a aplicação normalmente é montada em /app
    if os.path.exists("/app"):
        return "/app"
    # em desenvolvimento local, calcule a raiz do repositório a partir deste arquivo
    # caminho do arquivo: <repo>/projeto/app/routes/train_models.py
    # subindo 4 níveis chegamos à raiz do repositório
    return str(Path(__file__).resolve().parents[4])


def get_path(*parts):
    """
    Junta partes de caminho de forma segura e compatível com o ambiente.
    Sempre converte barras invertidas para barras normais.
    """
    base = get_base_path()
    # special-case predictions: keep them at project root/predictions for consistency
    if len(parts) == 1 and parts[0] == "predictions":
        p = os.path.join(base, "predictions")
        return p.replace("\\", "/")

    # when running locally (base is repo root), most storage paths live under projeto/app
    if base != "/app":
        p = os.path.join(base, "projeto", "app", *parts)
    else:
        # in container, assume parts are relative to /app
        p = os.path.join(base, *parts)
    return p.replace("\\", "/")


# ============================================================
# 🔧 Funções YOLO
# ============================================================

def function_train_yolo(
    dataset_path=None,
    model_name="yolo11n-cls.pt",
    epochs=50,
    imgsz=640,
    batch=16,
    project_name="projeto_yolo"
):
    """
    Treina um modelo YOLOv11 com parâmetros dinâmicos e caminhos automáticos.
    """

    try:
        from ultralytics import YOLO
    except ModuleNotFoundError as e:
        raise ModuleNotFoundError("Package 'ultralytics' is not installed. Install with: pip install ultralytics") from e

    # Caminho dinâmico para dataset
    if dataset_path is None:
        dataset_path = get_path("storage", "datasets_yolo", "CM", "01")

    print(f"\n🚀 Iniciando treinamento YOLOv11 ---------------")
    print(f"📂 Dataset: {dataset_path}")
    print(f"🤖 Modelo base: {model_name}")
    print(f"📊 Épocas: {epochs} | 🖼️ ImgSize: {imgsz} | 📦 Batch: {batch}\n")

    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"O dataset '{dataset_path}' não foi encontrado!")

    model = YOLO(model_name)
    model.train(
        data=dataset_path,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        name=project_name,
    )

    print(f"\n✅ Treinamento concluído! Resultados em 'runs/'\n")
    return model


def function_test_yolo(
    model_paths=None,
    dataset_path=None,
    split="val",
    project_name="results",
    output_dir=None
):
    """
    Avalia/testa um ou vários modelos YOLOv11 treinados.
    """

    if model_paths is None:
        raise ValueError("Você precisa fornecer pelo menos um modelo em 'model_paths'.")

    if isinstance(model_paths, str):
        model_paths = [model_paths]

    try:
        from ultralytics import YOLO
    except ModuleNotFoundError as e:
        raise ModuleNotFoundError("Package 'ultralytics' is not installed. Install with: pip install ultralytics") from e

    if dataset_path is None:
        dataset_path = get_path("storage", "datasets_yolo", "CM", "01")

    if output_dir is None:
        output_dir = get_path("predictions")

    print(f"\n🔍 Iniciando avaliação de {len(model_paths)} modelo(s) YOLOv11")
    print(f"📂 Dataset: {dataset_path} | Divisão: {split}")
    print(f"📁 Resultados serão salvos em: {output_dir}\n")

    all_results = {}

    for model_path in model_paths:
        model_name = os.path.basename(model_path).replace(".pt", "")
        model_output = os.path.join(output_dir, model_name)
        os.makedirs(model_output, exist_ok=True)

        print(f"📦 Avaliando modelo: {model_name}")

        if not os.path.exists(model_path):
            print(f"❌ Modelo não encontrado: {model_path}")
            continue
        print(f"🔄 Carregando modelo de: {os.path.abspath(dataset_path)}")
        model = YOLO(model_path)
        results = model.val(
            data=os.path.abspath(dataset_path),
            split=split,
            project=model_output,
            name=project_name
        )

        print(f"✅ Avaliação concluída para {model_name}!")
        print(f"📄 Resultados salvos em: {model_output}\n")

        all_results[model_name] = results

    print(f"\n📊 Todas as avaliações concluídas! Resultados em: {output_dir}\n")
    print("Result: ", all_results)
    return all_results


# ============================================================
# 🔧 Exemplo de uso dinâmico
# ============================================================
if __name__ == "__main__":
    models = [
        get_path("storage", "models_yolo", "01_best.pt"),
        get_path("storage", "models_yolo", "fabricante-1.pt"),
        get_path("storage", "models_yolo", "fabricante-2.pt")
    ]
    function_test_yolo(model_paths=models)
