"""Genera ejemplos con SD-Turbo y guarda las imágenes y sus parámetros."""

import argparse
import json
import os
import platform
import time
from pathlib import Path

import torch
from diffusers import AutoPipelineForText2Image


MODEL_ID = "stabilityai/sd-turbo"
MODEL_REVISION = "0096a99066b73650354282eeef18114cf0dab75c"
WIDTH = 512
HEIGHT = 512
DEFAULT_PROMPTS = [
    {
        "id": "taza",
        "title": "Una taza roja",
        "description": "Una taza roja de cerámica sobre una mesa de madera, con luz suave de mañana.",
        "modelPrompt": (
            "A single red ceramic mug on a wooden table, soft morning window light, "
            "simple composition, realistic photograph"
        ),
    },
    {
        "id": "escena",
        "title": "Perro, bicicleta y globo",
        "description": (
            "Un perro marrón junto a una bicicleta azul y un globo rojo atado al manillar, "
            "en un parque."
        ),
        "modelPrompt": (
            "A small brown dog beside one blue bicycle with one red balloon tied to its "
            "handlebar in a green city park, all three subjects clearly visible, sunny "
            "afternoon, realistic photograph"
        ),
    },
]
DEFAULT_OUTPUT = Path(__file__).resolve().parent.parent / "results"


def processor_name():
    if platform.system() == "Windows":
        import winreg

        try:
            with winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"HARDWARE\DESCRIPTION\System\CentralProcessor\0",
            ) as key:
                return winreg.QueryValueEx(key, "ProcessorNameString")[0].strip()
        except OSError:
            pass
    return platform.processor() or platform.machine()


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--device", choices=("auto", "cuda", "cpu"), default="auto")
    parser.add_argument("--seeds", nargs="+", type=int, default=[17, 41])
    parser.add_argument("--steps", nargs="+", type=int, default=[1, 4])
    parser.add_argument(
        "--prompt",
        action="append",
        metavar="TEXTO",
        help="Texto libre adicional. Se puede repetir para añadir ejemplos.",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def validate_args(args):
    if not args.seeds or any(seed < 0 or seed > 4_294_967_295 for seed in args.seeds):
        raise SystemExit("Indica semillas enteras entre 0 y 4294967295.")
    if len(set(args.seeds)) != len(args.seeds):
        raise SystemExit("No repitas semillas en una misma ejecución.")
    if not args.steps or any(steps < 1 or steps > 4 for steps in args.steps):
        raise SystemExit("SD-Turbo admite entre 1 y 4 pasos para esta comparación.")
    if len(set(args.steps)) != len(args.steps):
        raise SystemExit("No repitas pasos en una misma ejecución.")
    if any(not prompt.strip() for prompt in args.prompt or []):
        raise SystemExit("El texto de entrada no puede estar vacío.")


def synchronize(device):
    if device == "cuda":
        torch.cuda.synchronize()


def machine_info(device):
    processor = processor_name()
    return {
        "platform": platform.platform(),
        "processor": processor,
        "logicalCpuCount": os.cpu_count(),
        "pythonVersion": platform.python_version(),
        "torchVersion": torch.__version__,
        "device": device,
        "deviceName": torch.cuda.get_device_name(0) if device == "cuda" else processor,
    }


def main():
    args = parse_args()
    validate_args(args)

    device = args.device
    if device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cuda" and not torch.cuda.is_available():
        raise SystemExit("Se pidió CUDA, pero PyTorch no detecta una GPU compatible.")

    dtype = torch.float16 if device == "cuda" else torch.float32
    prompts = list(DEFAULT_PROMPTS)
    for index, text in enumerate(args.prompt or [], start=1):
        prompts.append(
            {
                "id": f"personalizado-{index}",
                "title": f"Texto personalizado {index}",
                "description": text,
                "modelPrompt": text,
            }
        )

    args.output.mkdir(parents=True, exist_ok=True)
    print(f"Cargando {MODEL_ID} ({MODEL_REVISION}) en {device}...")
    synchronize(device)
    started = time.perf_counter()
    pipeline = AutoPipelineForText2Image.from_pretrained(
        MODEL_ID,
        revision=MODEL_REVISION,
        torch_dtype=dtype,
        use_safetensors=True,
    ).to(device)
    synchronize(device)
    load_seconds = time.perf_counter() - started

    generations = []
    timings = []
    for prompt in prompts:
        for seed in args.seeds:
            for steps in args.steps:
                generator = torch.Generator(device=device).manual_seed(seed)
                synchronize(device)
                started = time.perf_counter()
                image = pipeline(
                    prompt=prompt["modelPrompt"],
                    num_inference_steps=steps,
                    guidance_scale=0.0,
                    width=WIDTH,
                    height=HEIGHT,
                    generator=generator,
                ).images[0]
                synchronize(device)
                elapsed = time.perf_counter() - started
                filename = f'{prompt["id"]}-semilla-{seed}-pasos-{steps}.png'
                image.save(args.output / filename)
                generations.append(
                    {
                        "promptId": prompt["id"],
                        "prompt": prompt["modelPrompt"],
                        "seed": seed,
                        "steps": steps,
                        "guidanceScale": 0.0,
                        "width": WIDTH,
                        "height": HEIGHT,
                        "image": filename,
                    }
                )
                timings.append(
                    {
                        "promptId": prompt["id"],
                        "seed": seed,
                        "steps": steps,
                        "seconds": round(elapsed, 3),
                    }
                )
                print(f"{filename}: {elapsed:.2f} s")

    manifest = {
        "model": MODEL_ID,
        "revision": MODEL_REVISION,
        "resolution": {"width": WIDTH, "height": HEIGHT},
        "device": device,
        "dtype": str(dtype),
        "modelLoadSeconds": round(load_seconds, 3),
        "machine": machine_info(device),
        "prompts": prompts,
        "generations": generations,
        "timingsSeconds": timings,
    }
    manifest_path = args.output / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Guardados {len(generations)} resultados en {args.output}")


if __name__ == "__main__":
    main()
