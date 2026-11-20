-- Plant Disease Detection: deterministic reference data
-- Run after migrations/001_initial_schema.sql.
--
-- No disease descriptions, prevention, or treatment claims are invented here.
-- All explanatory content remains pending expert review.

begin;

insert into public.model_versions (
    version,
    model_name,
    dataset_name,
    validation_accuracy,
    test_accuracy,
    macro_f1,
    model_card_path,
    metrics,
    notes
)
values (
    'plant-village-effnetb3-original-v1',
    'EfficientNetB3 (ImageNet base) + Dense(38, softmax)',
    'Plant Village (notebook training set)',
    0.9953334927558899,
    null,
    null,
    'backend/models/MODEL_CARD.md',
    jsonb_build_object(
        'source', 'Notebook-reported only; not independently reproduced.',
        'independentlyVerified', false,
        'trainAccuracy', 0.9977949857711792,
        'validationAccuracy', 0.9953334927558899,
        'testDirectory', '33 unlabeled images (no ground truth; unusable for evaluation)',
        'knownEvaluationWeaknesses', jsonb_build_array(
            'Validation used the augmenting training ImageDataGenerator with shuffle=True, so the reported validation accuracy is optimistic.',
            'No held-out labeled test set was evaluated.',
            'No per-class precision, recall, F1, or confusion matrix was produced.',
            'Plant Village has controlled backgrounds; field-image performance is unknown and expected to be lower.'
        ),
        'thresholds', jsonb_build_object(
            'uncertainBelow', 0.60,
            'highAtOrAbove', 0.90,
            'status', 'PROVISIONAL — pending calibration against a properly held-out labeled set.'
        )
    ),
    'Converted from the original notebook artifact with weights verified by name, shape, and exact value. See the model card for limitations and intended use.'
)
on conflict (version) do nothing;

insert into public.disease_information (
    class_index,
    model_label,
    plant_name,
    disease_name,
    source,
    content_status
)
values
    (0, 'Apple___Apple_scab', 'Apple', 'Apple scab', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (1, 'Apple___Black_rot', 'Apple', 'Black rot', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (2, 'Apple___Cedar_apple_rust', 'Apple', 'Cedar apple rust', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (3, 'Apple___healthy', 'Apple', 'Healthy', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (4, 'Blueberry___healthy', 'Blueberry', 'Healthy', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (5, 'Cherry_(including_sour)___Powdery_mildew', 'Cherry (including sour)', 'Powdery mildew', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (6, 'Cherry_(including_sour)___healthy', 'Cherry (including sour)', 'Healthy', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (7, 'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot', 'Corn (maize)', 'Cercospora leaf spot Gray leaf spot', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (8, 'Corn_(maize)___Common_rust_', 'Corn (maize)', 'Common rust', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (9, 'Corn_(maize)___Northern_Leaf_Blight', 'Corn (maize)', 'Northern Leaf Blight', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (10, 'Corn_(maize)___healthy', 'Corn (maize)', 'Healthy', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (11, 'Grape___Black_rot', 'Grape', 'Black rot', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (12, 'Grape___Esca_(Black_Measles)', 'Grape', 'Esca (Black Measles)', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (13, 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)', 'Grape', 'Leaf blight (Isariopsis Leaf Spot)', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (14, 'Grape___healthy', 'Grape', 'Healthy', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (15, 'Orange___Haunglongbing_(Citrus_greening)', 'Orange', 'Haunglongbing (Citrus greening)', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (16, 'Peach___Bacterial_spot', 'Peach', 'Bacterial spot', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (17, 'Peach___healthy', 'Peach', 'Healthy', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (18, 'Pepper,_bell___Bacterial_spot', 'Pepper, bell', 'Bacterial spot', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (19, 'Pepper,_bell___healthy', 'Pepper, bell', 'Healthy', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (20, 'Potato___Early_blight', 'Potato', 'Early blight', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (21, 'Potato___Late_blight', 'Potato', 'Late blight', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (22, 'Potato___healthy', 'Potato', 'Healthy', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (23, 'Raspberry___healthy', 'Raspberry', 'Healthy', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (24, 'Soybean___healthy', 'Soybean', 'Healthy', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (25, 'Squash___Powdery_mildew', 'Squash', 'Powdery mildew', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (26, 'Strawberry___Leaf_scorch', 'Strawberry', 'Leaf scorch', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (27, 'Strawberry___healthy', 'Strawberry', 'Healthy', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (28, 'Tomato___Bacterial_spot', 'Tomato', 'Bacterial spot', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (29, 'Tomato___Early_blight', 'Tomato', 'Early blight', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (30, 'Tomato___Late_blight', 'Tomato', 'Late blight', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (31, 'Tomato___Leaf_Mold', 'Tomato', 'Leaf Mold', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (32, 'Tomato___Septoria_leaf_spot', 'Tomato', 'Septoria leaf spot', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (33, 'Tomato___Spider_mites Two-spotted_spider_mite', 'Tomato', 'Spider mites Two-spotted spider mite', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (34, 'Tomato___Target_Spot', 'Tomato', 'Target Spot', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (35, 'Tomato___Tomato_Yellow_Leaf_Curl_Virus', 'Tomato', 'Tomato Yellow Leaf Curl Virus', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (36, 'Tomato___Tomato_mosaic_virus', 'Tomato', 'Tomato mosaic virus', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review'),
    (37, 'Tomato___healthy', 'Tomato', 'Healthy', 'Model-label mapping from plant-village-detection-99-54-accuracy.ipynb cell 24; educational content pending expert review.', 'pending_review')
on conflict (model_label) do update
set class_index = excluded.class_index,
    plant_name = excluded.plant_name,
    disease_name = excluded.disease_name;

commit;
