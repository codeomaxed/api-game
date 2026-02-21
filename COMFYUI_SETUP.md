# ComfyUI Setup Guide

This document lists everything needed to recreate the ComfyUI environment used by this project.
The `Image Generator/ComfyUI_windows_portable` folder is excluded from the repo due to its size (~100+ GB).

---

## Base Installation

| Component | Version / Details |
|-----------|-------------------|
| **ComfyUI** | v0.6.0 (commit `e4c61d7`) |
| **Python** | Embedded Python 3.13 (from ComfyUI portable) |
| **PyTorch** | 2.9.1+cu130 |
| **CUDA** | 13.0 (via torch) |
| **Frontend** | comfyui_frontend_package 1.34.9 |

Download the latest [ComfyUI Windows Portable](https://github.com/comfyanonymous/ComfyUI/releases) and extract it to `Image Generator/ComfyUI_windows_portable/`.

---

## Custom Nodes

Install these via [ComfyUI-Manager](https://github.com/Comfy-Org/ComfyUI-Manager) or clone them manually into `ComfyUI/custom_nodes/`.

| Custom Node | GitHub URL |
|-------------|------------|
| **ComfyUI-Manager** | https://github.com/Comfy-Org/ComfyUI-Manager |
| **cg-use-everywhere** | https://github.com/chrisgoringe/cg-use-everywhere |
| **ComfyUI-Chibi-Nodes** | https://github.com/chibiace/ComfyUI-Chibi-Nodes |
| **comfyui-custom-scripts** | https://github.com/pythongosssss/ComfyUI-Custom-Scripts |
| **ComfyUI-DepthAnythingV3** | https://github.com/kijai/ComfyUI-DepthAnythingV3 |
| **comfyui-easy-use** | https://github.com/yolain/ComfyUI-Easy-Use |
| **comfyui-florence2** | https://github.com/kijai/ComfyUI-Florence2 |
| **ComfyUI-GGUF** | https://github.com/city96/ComfyUI-GGUF |
| **ComfyUI-GGUF-FantasyTalking** | https://github.com/kael558/ComfyUI-GGUF-FantasyTalking |
| **ComfyUI-KJNodes** | https://github.com/kijai/ComfyUI-KJNodes |
| **comfyui-lama-remover** | https://github.com/Layer-norm/comfyui-lama-remover |
| **Comfyui-Resolution-Master** | https://github.com/jiaxiangc/ComfyUI-Resolution-Selector |
| **ComfyUI-RMBG** | https://github.com/1038lab/ComfyUI-RMBG |
| **comfyuidepthestimation** | https://github.com/Fannovel16/comfyui_controlnet_aux *(depth estimation is part of controlnet_aux)* |
| **comfyui_controlnet_aux** | https://github.com/Fannovel16/comfyui_controlnet_aux |
| **comfyui_essentials** | https://github.com/cubiq/ComfyUI_essentials |
| **comfyui_layerstyle** | https://github.com/chflame163/ComfyUI_LayerStyle |
| **comfyui_primere_nodes** | https://github.com/CosmicLaca/ComfyUI_Primere_Nodes |
| **ComfyUI_Swwan** | https://github.com/aining2022/ComfyUI_Swwan |
| **group_controller** | *(installed via ComfyUI-Manager — search "Group Controller")* |
| **rgthree-comfy** | https://github.com/rgthree/rgthree-comfy |
| **seedvr2_videoupscaler** | *(installed via ComfyUI-Manager — search "SeedVR2 Video Upscaler")* |
| **websocket_image_save.py** | Single-file node in `custom_nodes/` — included in `Workflows/` or reinstall via Manager |

---

## Models

All models go under `ComfyUI/models/`. Sizes are approximate.

### CLIP / Text Encoders

| File Path | Size | Source |
|-----------|------|--------|
| `clip/qwen/qwen_2.5_vl_7b_fp8_scaled.safetensors` | 8.74 GB | [HuggingFace: Qwen/Qwen2.5-VL-7B-Instruct](https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct) (FP8 quant) |
| `text_encoders/clip_l.safetensors` | 234.74 MB | [HuggingFace: comfyanonymous/flux_text_encoders](https://huggingface.co/comfyanonymous/flux_text_encoders) |
| `text_encoders/qwen_3_4b.safetensors` | 7.49 GB | [HuggingFace: Qwen/Qwen3-4B](https://huggingface.co/Qwen/Qwen3-4B) (safetensors) |

### ControlNet

| File Path | Size | Source |
|-----------|------|--------|
| `controlnet/Z-Image-Turbo-Fun-Controlnet-Union-2.1.safetensors` | 6.25 GB | [HuggingFace: Zheng-Chong/Z-Image-Turbo](https://huggingface.co/Zheng-Chong) |

### Depth Anything V3

| File Path | Size | Source |
|-----------|------|--------|
| `depthanything3/da3_base.safetensors` | 516.43 MB | [HuggingFace: DepthAnything/Depth-Anything-V3-Base](https://huggingface.co/depth-anything) |
| `depthanything3/da3_large.safetensors` | 1.53 GB | [HuggingFace: DepthAnything/Depth-Anything-V3-Large](https://huggingface.co/depth-anything) |

### Diffusion Models / UNet

| File Path | Size | Source |
|-----------|------|--------|
| `diffusion_models/qwen_image_fp8_e4m3fn.safetensors` | 19.03 GB | Qwen Image generation model (FP8 E4M3FN quantization) |
| `diffusion_models/z_image_turbo_bf16.safetensors` | 11.46 GB | Z-Image Turbo (BF16) |
| `unet/qwen_image_edit_2509_fp8_e4m3fn.safetensors` | 19.03 GB | Qwen Image Edit model (FP8 E4M3FN) |
| `unet/qwen_image_fp8_e4m3fn.safetensors` | 19.03 GB | Qwen Image model (FP8 E4M3FN) |
| `unet/z_image_turbo-bf16.gguf` | 11.47 GB | Z-Image Turbo (GGUF BF16 — for ComfyUI-GGUF node) |
| `unet/z_image_turbo-Q8_0.gguf` | 6.73 GB | Z-Image Turbo (GGUF Q8_0 — for ComfyUI-GGUF node) |

### Model Patches

| File Path | Size | Source |
|-----------|------|--------|
| `model_patches/Z-Image-Turbo-Fun-Controlnet-Union-2.1.safetensors` | 6.25 GB | Same as controlnet above (may be duplicate/symlink) |

### LLM / Vision Language Models

| File Path | Size | Source |
|-----------|------|--------|
| `LLM/Florence-2-base-ft/` (full directory) | ~885 MB | [HuggingFace: microsoft/Florence-2-base-ft](https://huggingface.co/microsoft/Florence-2-base-ft) |
| `LLM/Florence-2-large/` (full directory) | ~1.06 GB+ | [HuggingFace: microsoft/Florence-2-large](https://huggingface.co/microsoft/Florence-2-large) |
| `LLM/Qwen-VL/Qwen3-VL-2B-Instruct/` (full directory) | ~3.97 GB | [HuggingFace: Qwen/Qwen3-VL-2B-Instruct](https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct) |
| `LLM/Qwen-VL/Qwen3-VL-4B-Instruct-FP8/` (full directory) | ~1.25 GB+ | [HuggingFace: Qwen/Qwen3-VL-4B-Instruct](https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct) (FP8 quant) |

### SAM (Segment Anything)

| File Path | Size | Source |
|-----------|------|--------|
| `sam3/sam3.pt` | 3.21 GB | [SAM 3 model](https://github.com/facebookresearch/sam3) |

### VAE

| File Path | Size | Source |
|-----------|------|--------|
| `vae/ae.safetensors` | 319.77 MB | FLUX.1 AutoEncoder — [HuggingFace: black-forest-labs/FLUX.1-dev](https://huggingface.co/black-forest-labs/FLUX.1-dev) |
| `vae/qwen_image_vae.safetensors` | 242.05 MB | Qwen Image VAE |
| `vae/sdxl_vae.safetensors` | 319.14 MB | SDXL VAE — [HuggingFace: stabilityai/sdxl-vae](https://huggingface.co/stabilityai/sdxl-vae) |
| `vae/sharpspectrumvaexl_v1.safetensors` | 159.58 MB | [CivitAI: SharpSpectrumVAE XL](https://civitai.com/models/139961) |
| `vae/wan_2.1_vae.safetensors` | 242.06 MB | Wan 2.1 VAE |

### VAE Approx (TAESD — Tiny AutoEncoder)

| File Path | Size | Source |
|-----------|------|--------|
| `vae_approx/taef1_decoder.safetensors` | 2.35 MB | [HuggingFace: madebyollin/taef1](https://huggingface.co/madebyollin/taef1) |
| `vae_approx/taef1_encoder.safetensors` | 2.35 MB | *(same repo)* |
| `vae_approx/taesd3_decoder.safetensors` | 2.35 MB | [HuggingFace: madebyollin/taesd3](https://huggingface.co/madebyollin/taesd3) |
| `vae_approx/taesd3_encoder.safetensors` | 2.35 MB | *(same repo)* |
| `vae_approx/taesdxl_decoder.safetensors` | 2.34 MB | [HuggingFace: madebyollin/taesdxl](https://huggingface.co/madebyollin/taesdxl) |
| `vae_approx/taesdxl_encoder.safetensors` | 2.34 MB | *(same repo)* |
| `vae_approx/taesd_decoder.safetensors` | 2.34 MB | [HuggingFace: madebyollin/taesd](https://huggingface.co/madebyollin/taesd) |
| `vae_approx/taesd_encoder.safetensors` | 2.34 MB | *(same repo)* |

---

## Key Python Packages (Embedded Python)

These are pre-installed in the ComfyUI portable distribution. Listed here for reference if doing a manual install.

| Package | Version |
|---------|---------|
| torch | 2.9.1+cu130 |
| torchvision | 0.24.1+cu130 |
| torchaudio | 2.9.1+cu130 |
| transformers | 4.57.1 |
| safetensors | 0.6.2 |
| onnxruntime | 1.23.2 |
| onnxruntime-gpu | 1.23.2 |
| open_clip_torch | 3.2.0 |
| pytorch-lightning | 2.6.0 |

---

## Workflows

Workflow JSON files are stored in the `Workflows/` folder at the project root (not inside ComfyUI).

| File | Description |
|------|-------------|
| `Workflows/Comfyui API.json` | Main API workflow (current) |
| `Workflows/Character Segment.json` | Character segmentation workflow |
| `Workflows/Previous/Comfy API.json` | Previous API workflow v1 |
| `Workflows/Previous/Comfy API 2.json` | Previous API workflow v2 |
| `Workflows/Previous/Comfy API3.json` | Previous API workflow v3 |
| `Workflows/Previous/Comfy API4.json` | Previous API workflow v4 |

To use these workflows, import them into ComfyUI via **Load Workflow** or copy them to `ComfyUI/user/default/workflows/`.

---

## Quick Setup Steps

1. Download [ComfyUI Windows Portable](https://github.com/comfyanonymous/ComfyUI/releases) (v0.6.0+)
2. Extract to `Image Generator/ComfyUI_windows_portable/`
3. Install **ComfyUI-Manager** first:
   ```
   cd ComfyUI/custom_nodes
   git clone https://github.com/Comfy-Org/ComfyUI-Manager.git
   ```
4. Start ComfyUI and use the Manager to install all custom nodes listed above
5. Download all models from the sources listed above and place them in the correct `ComfyUI/models/` subdirectories
6. Import workflows from the `Workflows/` folder

---

## Empty Model Directories

These directories exist in the default ComfyUI install but are currently unused by this project:

- `audio_encoders/`
- `checkpoints/`
- `clip_vision/`
- `diffusers/`
- `embeddings/`
- `gligen/`
- `hypernetworks/`
- `latent_upscale_models/`
- `loras/`
- `photomaker/`
- `style_models/`
- `upscale_models/`
