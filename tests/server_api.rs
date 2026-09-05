use axum::{
    body::{to_bytes, Body},
    http::{header, Request, StatusCode},
};
use rankless_rally_server::{app, build_state};
use std::{
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};
use tower::ServiceExt;

fn test_state() -> (rankless_rally_server::AppState, PathBuf) {
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let directory = std::env::temp_dir().join(format!(
        "rankless-rally-api-{}-{unique}",
        std::process::id()
    ));
    let state = build_state(directory.clone(), PathBuf::from("dist"), "test".to_owned()).unwrap();
    (state, directory)
}

async fn json(response: axum::response::Response) -> serde_json::Value {
    let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    serde_json::from_slice(&bytes).unwrap()
}

#[tokio::test]
async fn api_accepts_only_completed_routes_and_resolves_a_persisted_public_code() {
    let (state, directory) = test_state();
    let service = app(state.clone());
    let invalid = Request::builder()
        .method("POST")
        .uri("/api/replays")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(r#"{"board_id":"practice-01","moves":"R"}"#))
        .unwrap();
    let invalid_response = service.clone().oneshot(invalid).await.unwrap();
    assert_eq!(invalid_response.status(), StatusCode::UNPROCESSABLE_ENTITY);

    let completed = Request::builder()
        .method("POST")
        .uri("/api/replays")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(
            r#"{"board_id":"practice-01","moves":"RRRRRURUUUUU"}"#,
        ))
        .unwrap();
    let created = service.clone().oneshot(completed).await.unwrap();
    assert_eq!(created.status(), StatusCode::CREATED);
    let replay = json(created).await;
    let code = replay["code"].as_str().unwrap();
    assert!(code.starts_with("RR2-"));
    assert!(replay.get("name").is_none());

    let read = Request::builder()
        .uri(format!("/api/replays/{code}"))
        .body(Body::empty())
        .unwrap();
    let resolved = service.clone().oneshot(read).await.unwrap();
    assert_eq!(resolved.status(), StatusCode::OK);
    assert_eq!(json(resolved).await["moves"], "RRRRRURUUUUU");

    drop(service);
    let restarted =
        app(build_state(directory.clone(), PathBuf::from("dist"), "test".to_owned()).unwrap());
    let after_restart = restarted
        .oneshot(
            Request::builder()
                .uri(format!("/api/replays/{code}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(after_restart.status(), StatusCode::OK);
    let _ = std::fs::remove_dir_all(directory);
}

#[tokio::test]
async fn api_keeps_demo_replays_inside_the_demo_namespace_and_sets_retry_after() {
    let (state, directory) = test_state();
    let service = app(state);
    let public_sample = service
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/replays/demo")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(public_sample.status(), StatusCode::NOT_FOUND);
    let sample = service
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/replays/demo")
                .header("x-rankless-sandbox", "demo")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(sample.status(), StatusCode::OK);
    let code = json(sample).await["code"].as_str().unwrap().to_owned();
    let public_read = service
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/replays/{code}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(public_read.status(), StatusCode::NOT_FOUND);
    let demo_read = service
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/replays/{code}"))
                .header("x-rankless-sandbox", "demo")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(demo_read.status(), StatusCode::OK);

    let mut limited = None;
    for _ in 0..64 {
        let response = service
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/replays/demo")
                    .header("x-forwarded-for", "198.51.100.8")
                    .header("x-rankless-sandbox", "demo")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        if response.status() == StatusCode::TOO_MANY_REQUESTS {
            limited = Some(response);
            break;
        }
    }
    let response = limited.expect("the replay API should rate limit a client");
    assert_eq!(
        response
            .headers()
            .get(header::RETRY_AFTER)
            .and_then(|value| value.to_str().ok()),
        Some("1")
    );
    let _ = std::fs::remove_dir_all(directory);
}
