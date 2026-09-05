use axum::{
    body::Body,
    extract::{Path, Request, State},
    http::{header, HeaderMap, HeaderValue, StatusCode, Uri},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use rand::{thread_rng, Rng};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    env,
    path::{Component, Path as FilePath, PathBuf},
    sync::{Arc, Mutex},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

const DEMO_ROUTE: &str = "RRRRRURUUUUU";
const DEMO_CODE: &str = "RR2-DEMO-PRACTICE-01";
const MAX_MOVES: usize = 512;
const MAX_REQUESTS_PER_SECOND: u32 = 60;

#[derive(Clone)]
pub struct AppState {
    database: Arc<Mutex<Connection>>,
    static_dir: Arc<PathBuf>,
    build_sha: Arc<String>,
    rate_limits: Arc<Mutex<HashMap<String, RateWindow>>>,
}

#[derive(Clone)]
struct RateWindow {
    started: Instant,
    requests: u32,
}

#[derive(Deserialize)]
struct ReplaySubmission {
    board_id: String,
    moves: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct ReplayRecord {
    pub code: String,
    pub board_id: String,
    pub moves: String,
}

#[derive(Serialize)]
struct ErrorBody {
    error: &'static str,
}

#[derive(Serialize)]
struct HealthBody {
    status: &'static str,
    build: String,
    database: &'static str,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Tenant {
    Public,
    Demo,
}

impl Tenant {
    fn as_str(self) -> &'static str {
        match self {
            Self::Public => "public",
            Self::Demo => "demo",
        }
    }

    fn expiration(self) -> Option<i64> {
        match self {
            Self::Public => None,
            Self::Demo => Some(now_seconds() + 86_400),
        }
    }
}

#[derive(Clone, Copy)]
struct Point {
    x: i32,
    y: i32,
}

impl Point {
    const fn new(x: i32, y: i32) -> Self {
        Self { x, y }
    }
}

#[derive(Clone)]
struct Board {
    size: i32,
    start: Point,
    exit: Point,
    relays: [Point; 3],
    walls: Vec<Point>,
}

pub fn data_dir_from_environment() -> PathBuf {
    if let Ok(value) = env::var("RANKLESS_RALLY_DATA_DIR") {
        return PathBuf::from(value);
    }
    let durable = PathBuf::from("/data");
    if durable.is_dir() {
        durable
    } else {
        PathBuf::from("data")
    }
}

pub fn static_dir_from_environment() -> PathBuf {
    env::var("RANKLESS_RALLY_STATIC_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("dist"))
}

pub fn build_state(
    data_dir: PathBuf,
    static_dir: PathBuf,
    build_sha: String,
) -> Result<AppState, String> {
    std::fs::create_dir_all(&data_dir)
        .map_err(|error| format!("could not create data directory: {error}"))?;
    let database_path = data_dir.join("rankless-rally.sqlite3");
    let connection = Connection::open(&database_path)
        .map_err(|error| format!("could not open SQLite: {error}"))?;
    connection
        .execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA busy_timeout = 5000;
             CREATE TABLE IF NOT EXISTS replay_records (
               code TEXT PRIMARY KEY NOT NULL,
               board_id TEXT NOT NULL,
               moves TEXT NOT NULL,
               tenant TEXT NOT NULL CHECK (tenant IN ('public', 'demo')),
               created_at INTEGER NOT NULL,
               expires_at INTEGER
             );
             CREATE INDEX IF NOT EXISTS replay_records_expiry ON replay_records(expires_at);",
        )
        .map_err(|error| format!("could not migrate SQLite: {error}"))?;
    Ok(AppState {
        database: Arc::new(Mutex::new(connection)),
        static_dir: Arc::new(static_dir),
        build_sha: Arc::new(build_sha),
        rate_limits: Arc::new(Mutex::new(HashMap::new())),
    })
}

pub fn app(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/api/replays", post(create_replay))
        .route("/api/replays/demo", get(demo_replay))
        .route("/api/replays/{code}", get(read_replay))
        .fallback(static_file)
        .layer(middleware::from_fn(security_headers))
        .layer(middleware::from_fn_with_state(state.clone(), rate_limit))
        .with_state(state)
}

async fn health(State(state): State<AppState>) -> impl IntoResponse {
    Json(HealthBody {
        status: "ok",
        build: (*state.build_sha).clone(),
        database: "ready",
    })
}

fn json_error(status: StatusCode, error: &'static str) -> Response {
    (status, Json(ErrorBody { error })).into_response()
}

fn log_event(event: &str, detail: &str) {
    eprintln!("{{\"event\":{event:?},\"detail\":{detail:?}}}");
}

async fn create_replay(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(submission): Json<ReplaySubmission>,
) -> Response {
    let board_id = submission.board_id.trim().to_ascii_lowercase();
    let moves = submission.moves.trim().to_ascii_uppercase();
    if !verify_moves(&board_id, &moves) {
        return json_error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "The replay does not complete this board.",
        );
    }
    let tenant = tenant_from_headers(&headers);
    match store_replay(&state, tenant, &board_id, &moves, None) {
        Ok(record) => (StatusCode::CREATED, Json(record)).into_response(),
        Err(error) => {
            log_event("replay_persistence_failed", &error.to_string());
            json_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "The replay could not be saved.",
            )
        }
    }
}

async fn demo_replay(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if tenant_from_headers(&headers) != Tenant::Demo {
        return json_error(StatusCode::NOT_FOUND, "The replay code was not found.");
    }
    if !verify_moves("practice-01", DEMO_ROUTE) {
        return json_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "The sample replay is unavailable.",
        );
    }
    match store_replay(
        &state,
        Tenant::Demo,
        "practice-01",
        DEMO_ROUTE,
        Some(DEMO_CODE.to_owned()),
    ) {
        Ok(record) => Json(record).into_response(),
        Err(error) => {
            log_event("demo_replay_persistence_failed", &error.to_string());
            json_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "The sample replay is unavailable.",
            )
        }
    }
}

async fn read_replay(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(code): Path<String>,
) -> Response {
    let code = code.trim().to_ascii_uppercase();
    if !valid_code(&code) {
        return json_error(StatusCode::NOT_FOUND, "The replay code was not found.");
    }
    match load_replay(&state, tenant_from_headers(&headers), &code) {
        Ok(Some(record)) if verify_moves(&record.board_id, &record.moves) => {
            Json(record).into_response()
        }
        Ok(Some(_)) => {
            log_event("stored_replay_failed_verification", &code);
            json_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "The replay is unavailable.",
            )
        }
        Ok(None) => json_error(StatusCode::NOT_FOUND, "The replay code was not found."),
        Err(error) => {
            log_event("replay_lookup_failed", &error.to_string());
            json_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "The replay is unavailable.",
            )
        }
    }
}

async fn rate_limit(State(state): State<AppState>, request: Request, next: Next) -> Response {
    if !request.uri().path().starts_with("/api/") {
        return next.run(request).await;
    }
    let key = request
        .headers()
        .get("x-forwarded-for")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(',').next())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("local")
        .to_owned();
    let limited = {
        let mut limits = match state.rate_limits.lock() {
            Ok(limits) => limits,
            Err(_) => {
                return json_error(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "The replay service is unavailable.",
                )
            }
        };
        let now = Instant::now();
        let window = limits.entry(key).or_insert(RateWindow {
            started: now,
            requests: 0,
        });
        if now.duration_since(window.started) >= Duration::from_secs(1) {
            window.started = now;
            window.requests = 0;
        }
        window.requests += 1;
        window.requests > MAX_REQUESTS_PER_SECOND
    };
    if limited {
        let mut response = json_error(
            StatusCode::TOO_MANY_REQUESTS,
            "Too many replay requests. Try again shortly.",
        );
        response
            .headers_mut()
            .insert(header::RETRY_AFTER, HeaderValue::from_static("1"));
        return response;
    }
    next.run(request).await
}

async fn security_headers(request: Request, next: Next) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert(
        "x-content-type-options",
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        "referrer-policy",
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    headers.insert(
        "content-security-policy",
        HeaderValue::from_static("default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"),
    );
    response
}

async fn static_file(State(state): State<AppState>, uri: Uri) -> Response {
    let Some(path) = safe_static_path(&state.static_dir, uri.path()) else {
        return static_response(state.static_dir.join("404.html"), StatusCode::NOT_FOUND).await;
    };
    match tokio::fs::metadata(&path).await {
        Ok(metadata) if metadata.is_file() => static_response(path, StatusCode::OK).await,
        Ok(metadata) if metadata.is_dir() => {
            let index = path.join("index.html");
            static_response(index, StatusCode::OK).await
        }
        _ => {
            let extensionless = path.extension().is_none();
            if extensionless {
                let html_path = path.with_extension("html");
                if tokio::fs::metadata(&html_path).await.is_ok() {
                    return static_response(html_path, StatusCode::OK).await;
                }
            }
            static_response(state.static_dir.join("404.html"), StatusCode::NOT_FOUND).await
        }
    }
}

fn safe_static_path(root: &FilePath, request_path: &str) -> Option<PathBuf> {
    let relative = if request_path == "/" {
        FilePath::new("index.html")
    } else {
        FilePath::new(request_path.trim_start_matches('/'))
    };
    if relative
        .components()
        .any(|component| !matches!(component, Component::Normal(_)))
    {
        return None;
    }
    Some(root.join(relative))
}

async fn static_response(path: PathBuf, status: StatusCode) -> Response {
    match tokio::fs::read(&path).await {
        Ok(contents) => {
            let content_type = match path.extension().and_then(|extension| extension.to_str()) {
                Some("html") => "text/html; charset=utf-8",
                Some("css") => "text/css; charset=utf-8",
                Some("js") => "text/javascript; charset=utf-8",
                Some("json") => "application/json; charset=utf-8",
                Some("svg") => "image/svg+xml",
                Some("xml") => "application/xml; charset=utf-8",
                Some("txt") => "text/plain; charset=utf-8",
                Some("ico") => "image/x-icon",
                _ => "application/octet-stream",
            };
            (
                status,
                [(header::CONTENT_TYPE, content_type)],
                Body::from(contents),
            )
                .into_response()
        }
        Err(_) => (StatusCode::NOT_FOUND, "Not found").into_response(),
    }
}

fn tenant_from_headers(headers: &HeaderMap) -> Tenant {
    if headers
        .get("x-rankless-sandbox")
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.eq_ignore_ascii_case("demo"))
    {
        Tenant::Demo
    } else {
        Tenant::Public
    }
}

fn now_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn clean_expired(connection: &Connection) -> rusqlite::Result<()> {
    connection.execute(
        "DELETE FROM replay_records WHERE expires_at IS NOT NULL AND expires_at <= ?1",
        params![now_seconds()],
    )?;
    Ok(())
}

fn store_replay(
    state: &AppState,
    tenant: Tenant,
    board_id: &str,
    moves: &str,
    fixed_code: Option<String>,
) -> Result<ReplayRecord, rusqlite::Error> {
    let connection = state.database.lock().expect("SQLite mutex poisoned");
    clean_expired(&connection)?;
    if let Some(code) = fixed_code {
        connection.execute(
            "INSERT OR IGNORE INTO replay_records (code, board_id, moves, tenant, created_at, expires_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![code, board_id, moves, tenant.as_str(), now_seconds(), tenant.expiration()],
        )?;
        return connection.query_row(
            "SELECT code, board_id, moves FROM replay_records WHERE code = ?1",
            params![code],
            |row| {
                Ok(ReplayRecord {
                    code: row.get(0)?,
                    board_id: row.get(1)?,
                    moves: row.get(2)?,
                })
            },
        );
    }
    for _ in 0..5 {
        let code = new_code();
        let inserted = connection.execute(
            "INSERT OR IGNORE INTO replay_records (code, board_id, moves, tenant, created_at, expires_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![code, board_id, moves, tenant.as_str(), now_seconds(), tenant.expiration()],
        )?;
        if inserted == 1 {
            return Ok(ReplayRecord {
                code,
                board_id: board_id.to_owned(),
                moves: moves.to_owned(),
            });
        }
    }
    Err(rusqlite::Error::ExecuteReturnedResults)
}

fn load_replay(
    state: &AppState,
    tenant: Tenant,
    code: &str,
) -> Result<Option<ReplayRecord>, rusqlite::Error> {
    let connection = state.database.lock().expect("SQLite mutex poisoned");
    clean_expired(&connection)?;
    let mut statement = connection.prepare(
        "SELECT code, board_id, moves FROM replay_records
         WHERE code = ?1 AND (tenant = 'public' OR tenant = ?2)",
    )?;
    let mut records = statement.query(params![code, tenant.as_str()])?;
    records
        .next()?
        .map(|row| {
            Ok(ReplayRecord {
                code: row.get(0)?,
                board_id: row.get(1)?,
                moves: row.get(2)?,
            })
        })
        .transpose()
}

fn new_code() -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut random = thread_rng();
    let suffix: String = (0..16)
        .map(|_| ALPHABET[random.gen_range(0..ALPHABET.len())] as char)
        .collect();
    format!("RR2-{suffix}")
}

fn valid_code(code: &str) -> bool {
    code.starts_with("RR2-")
        && code.len() <= 40
        && code
            .bytes()
            .all(|byte| byte.is_ascii_uppercase() || byte.is_ascii_digit() || byte == b'-')
}

fn board_for_id(id: &str) -> Option<Board> {
    if id == "practice-01" {
        return Some(Board {
            size: 7,
            start: Point::new(0, 6),
            exit: Point::new(6, 0),
            relays: [Point::new(2, 6), Point::new(5, 5), Point::new(6, 1)],
            walls: vec![Point::new(1, 5), Point::new(1, 4), Point::new(2, 4)],
        });
    }
    if let Some(number) = id
        .strip_prefix("practice-")
        .and_then(|value| value.parse::<u8>().ok())
    {
        if !(2..=20).contains(&number) {
            return None;
        }
        let wall_count = std::cmp::min(10, 4 + ((number - 2) / 3) as usize);
        return Some(generated_board(
            &format!("PRACTICE-{number:02}"),
            wall_count,
        ));
    }
    let date = id.strip_prefix("daily-")?;
    if !valid_date(date) {
        return None;
    }
    Some(generated_board(&format!("DAILY-{date}"), 10))
}

fn valid_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| matches!(index, 4 | 7) || byte.is_ascii_digit())
}

fn generated_board(seed: &str, wall_count: usize) -> Board {
    let mut random = Seeded::new(seed);
    let safe = [
        Point::new(0, 6),
        Point::new(6, 0),
        Point::new(2, 6),
        Point::new(5, 5),
        Point::new(6, 1),
        Point::new(1, 6),
        Point::new(3, 6),
        Point::new(4, 6),
        Point::new(5, 6),
        Point::new(6, 5),
        Point::new(6, 4),
        Point::new(6, 3),
        Point::new(6, 2),
    ];
    let mut walls = Vec::new();
    while walls.len() < wall_count {
        let point = Point::new(random.cell(), random.cell());
        if !contains(&safe, point) && !contains(&walls, point) {
            walls.push(point);
        }
    }
    Board {
        size: 7,
        start: Point::new(0, 6),
        exit: Point::new(6, 0),
        relays: [Point::new(2, 6), Point::new(5, 5), Point::new(6, 1)],
        walls,
    }
}

struct Seeded {
    value: u32,
}

impl Seeded {
    fn new(seed: &str) -> Self {
        let mut value: u32 = 2_166_136_261;
        for character in seed.chars() {
            value ^= character as u32;
            value = value.wrapping_mul(16_777_619);
        }
        Self {
            value: if value == 0 { 1 } else { value },
        }
    }

    fn cell(&mut self) -> i32 {
        self.value = self.value.wrapping_add(0x6d2b79f5);
        let mut result = self.value;
        result = (result ^ (result >> 15)).wrapping_mul(result | 1);
        result ^= result.wrapping_add((result ^ (result >> 7)).wrapping_mul(result | 61));
        let random = result ^ (result >> 14);
        ((random as f64 / 4_294_967_296.0) * 7.0).floor() as i32
    }
}

fn contains(points: &[Point], candidate: Point) -> bool {
    points
        .iter()
        .any(|point| point.x == candidate.x && point.y == candidate.y)
}

pub fn verify_moves(board_id: &str, moves: &str) -> bool {
    if moves.is_empty()
        || moves.len() > MAX_MOVES
        || !moves
            .bytes()
            .all(|byte| matches!(byte, b'U' | b'D' | b'L' | b'R'))
    {
        return false;
    }
    let Some(board) = board_for_id(board_id) else {
        return false;
    };
    let mut player = board.start;
    let mut relay_index = 0usize;
    let mut won = false;
    for byte in moves.bytes() {
        if won {
            return false;
        }
        let next = match byte {
            b'U' => Point::new(player.x, player.y - 1),
            b'D' => Point::new(player.x, player.y + 1),
            b'L' => Point::new(player.x - 1, player.y),
            b'R' => Point::new(player.x + 1, player.y),
            _ => return false,
        };
        if next.x < 0
            || next.y < 0
            || next.x >= board.size
            || next.y >= board.size
            || contains(&board.walls, next)
        {
            return false;
        }
        player = next;
        if relay_index < board.relays.len()
            && player.x == board.relays[relay_index].x
            && player.y == board.relays[relay_index].y
        {
            relay_index += 1;
        }
        if player.x == board.exit.x && player.y == board.exit.y && relay_index == board.relays.len()
        {
            won = true;
        }
    }
    won
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_the_known_completed_practice_route() {
        assert!(verify_moves("practice-01", DEMO_ROUTE));
    }

    #[test]
    fn rejects_blocked_incomplete_and_post_win_routes() {
        assert!(!verify_moves("practice-01", "R"));
        assert!(!verify_moves("practice-01", "L"));
        assert!(!verify_moves("practice-01", "RRRRRURUUUUUR"));
    }

    #[test]
    fn replay_rows_persist_and_keep_demo_rows_out_of_the_public_namespace() {
        let directory = env::temp_dir().join(format!("rankless-rally-test-{}", now_seconds()));
        let state =
            build_state(directory.clone(), PathBuf::from("dist"), "test".to_owned()).unwrap();
        let public = store_replay(
            &state,
            Tenant::Public,
            "practice-01",
            DEMO_ROUTE,
            Some("RR2-PUBLIC-TEST".to_owned()),
        )
        .unwrap();
        let demo = store_replay(
            &state,
            Tenant::Demo,
            "practice-01",
            DEMO_ROUTE,
            Some("RR2-DEMO-TEST".to_owned()),
        )
        .unwrap();
        assert_eq!(
            load_replay(&state, Tenant::Public, &public.code).unwrap(),
            Some(public)
        );
        assert_eq!(
            load_replay(&state, Tenant::Public, &demo.code).unwrap(),
            None
        );
        drop(state);
        let restarted =
            build_state(directory.clone(), PathBuf::from("dist"), "test".to_owned()).unwrap();
        assert!(load_replay(&restarted, Tenant::Public, "RR2-PUBLIC-TEST")
            .unwrap()
            .is_some());
        let _ = std::fs::remove_dir_all(directory);
    }
}
