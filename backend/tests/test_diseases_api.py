"""Disease catalog tests: 38 supported classes, detail lookup, content merge."""

from __future__ import annotations

from fakes import InMemoryDiseaseRepository, build_services


def test_list_returns_all_38_supported_classes(make_client, metadata):
    client = make_client()
    response = client.get("/api/v1/diseases")
    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 38
    assert len(body["diseases"]) == 38
    first = body["diseases"][0]
    assert first["label"] == metadata.labels[0]
    assert first["plant"] == "Apple"
    assert first["condition"] == "Apple scab"
    # unseeded content stays null rather than invented
    assert first["description"] is None


def test_detail_by_model_label(make_client):
    client = make_client()
    response = client.get("/api/v1/diseases/Apple___healthy")
    assert response.status_code == 200
    body = response.json()
    assert body["plant"] == "Apple"
    assert body["condition"] == "Healthy"
    assert body["label"] == "Apple___healthy"


def test_detail_unknown_class_returns_404(make_client):
    client = make_client()
    response = client.get("/api/v1/diseases/Not_a_real_class")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "DISEASE_NOT_FOUND"


def test_detail_merges_seeded_disease_information(
    make_client, settings, metadata, services
):
    seeded = InMemoryDiseaseRepository(
        [
            {
                "id": "row-uuid-1",
                "plant_name": "Potato",
                "disease_name": "Late blight",
                "description": "Reviewed educational content.",
                "symptoms": "Brown lesions.",
                "prevention": None,
                "treatment_note": None,
                "source": "extension bulletin",
                "updated_at": "2026-11-18T00:00:00+00:00",
            }
        ]
    )
    ns = build_services(
        settings,
        metadata,
        services.predictor,
        repo=services.repo,
        storage=services.storage,
        disease_repo=seeded,
        feedback_repo=services.feedback_repo,
    )
    client = make_client(services_ns=ns)

    response = client.get("/api/v1/diseases/Potato___Late_blight")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "row-uuid-1"
    assert body["description"] == "Reviewed educational content."
    assert body["source"] == "extension bulletin"


def test_detail_by_database_id(make_client, settings, metadata, services):
    seeded = InMemoryDiseaseRepository(
        [
            {
                "id": "row-uuid-2",
                "plant_name": "Tomato",
                "disease_name": "Healthy",
                "description": None,
                "symptoms": None,
                "prevention": None,
                "treatment_note": None,
                "source": None,
                "updated_at": None,
            }
        ]
    )
    ns = build_services(
        settings,
        metadata,
        services.predictor,
        repo=services.repo,
        storage=services.storage,
        disease_repo=seeded,
        feedback_repo=services.feedback_repo,
    )
    client = make_client(services_ns=ns)

    response = client.get("/api/v1/diseases/row-uuid-2")

    assert response.status_code == 200
    body = response.json()
    assert body["label"] == "Tomato___healthy"
    assert body["plant"] == "Tomato"
