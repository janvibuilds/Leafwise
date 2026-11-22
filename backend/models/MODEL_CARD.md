# Model Card — Plant Disease Classification (EfficientNetB3)

**Model version:** `plant-village-effnetb3-original-v1`
**Status:** Packaged and verified for the FastAPI runtime; metrics are notebook-reported and **not independently reproduced**.

## Model details

| Item | Value |
| --- | --- |
| Architecture | EfficientNetB3 (ImageNet weights base) + global pooling + Dense(38, softmax) |
| Task | Single-label classification, 38 Plant Village classes (including healthy) |
| Input | 224×224 RGB image |
| Output | 38-way softmax probability vector |
| Training framework | TensorFlow/Keras (original file saved with Keras 3.5.0) |
| Runtime artifact | `backend/models/plant_disease_model_tf/` (TensorFlow SavedModel; architecture rebuilt and all 501 original weights copied and verified) |
| Research artifact | `Plant_Village_Detection_Model.h5` at repository root (never modified, never committed, never loaded at request time) |
| Class order | `backend/models/labels.json` (authoritative; from the notebook's `class_indices`) |

The notebook (`plant-village-detection-99-54-accuracy.ipynb`) is a research/training artifact only. It is **never executed inside the production request path**.

## Intended use

- **In scope:** educational/demo classification of leaf images that resemble the Plant Village dataset (controlled background, centered leaf).
- **Out of scope:** field diagnostics, agricultural treatment decisions, commercial crop-health claims. The application must not present results as agronomic advice.

## Preprocessing contract

Replicated exactly from training (see `preprocessing.json`):

1. EXIF orientation transpose (Pillow `ImageOps.exif_transpose`).
2. Convert to RGB.
3. Resize to 224×224 with **NEAREST** interpolation.
4. Divide by 255 → float32 in `[0, 1]`.

The model then applies `Rescaling(1/255)` → `Normalization` → `Rescaling` **internally**, so training used deliberate double scaling. Never apply `keras.applications.efficientnet.preprocess_input` or any ImageNet mean/std normalization.

## Training data and metrics (notebook-reported)

| Metric | Value |
| --- | --- |
| Train samples | 70,295 |
| Validation samples | 17,572 |
| Train accuracy | 0.9977949857711792 |
| Validation accuracy | 0.9953334927558899 |

**These numbers come from the notebook output only.** They have not been independently reproduced in this environment (dataset not present) and are marked as such in `metrics.json`.

### Known evaluation weaknesses

- The validation generator reused the **augmenting** training `ImageDataGenerator` with `shuffle=True`, so reported validation accuracy is optimistic.
- The test directory contains 33 **unlabeled** images — no held-out labeled evaluation was performed.
- No per-class precision/recall/F1 or confusion matrix exists.
- Plant Village has controlled backgrounds; field-image accuracy is unknown and expected to be materially lower.

## Decision thresholds (PROVISIONAL)

| State | Condition |
| --- | --- |
| `uncertain` | top-1 confidence < 0.60 |
| normal result | 0.60 ≤ top-1 < 0.90 |
| high confidence (annotated) | top-1 ≥ 0.90 |

These thresholds are **provisional pending calibration** against a properly held-out labeled set. They are not validated operating points.

## Risks and limitations

- **Domain shift:** trained on lab-style leaf images; real field photos (varied lighting, background, occlusion, phone camera artifacts) will degrade performance.
- **Label noise / dataset bias:** Plant Village classes are single-crop, single-pathogen composites; overlapping symptoms across crops are not modeled.
- **Calibration:** softmax confidence is not guaranteed to be calibrated; the `uncertain` state exists because of this.
- **Maintenance:** a retrained model must preserve the label order in `labels.json` or version that asset explicitly.

## Conversion provenance

`backend/tools/convert_legacy_h5.py` rebuilds the documented architecture directly in Keras 3.12 (avoiding the legacy H5 nested-Functional deserialization bug), reassigns every H5 weight **by name**, verifies shape and exact value for all 501 weights, checks that different inputs produce different predictions, exports a TensorFlow SavedModel, and verifies the frozen-graph round-trip is identical. The `.keras` format is not used because Keras 3.12 mis-serializes this EfficientNet sub-model and silently changes its predictions.
