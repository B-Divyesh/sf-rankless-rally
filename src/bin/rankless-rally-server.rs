use rankless_rally_server::{
    app, build_state, data_dir_from_environment, static_dir_from_environment,
};
use std::env;

#[tokio::main]
async fn main() {
    let port = env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8080);
    let data_dir = data_dir_from_environment();
    let build_sha = option_env!("BUILD_SHA").unwrap_or("dev").to_owned();
    let state = match build_state(
        data_dir.clone(),
        static_dir_from_environment(),
        build_sha.clone(),
    ) {
        Ok(state) => state,
        Err(error) => {
            eprintln!("{{\"event\":\"startup_failed\",\"detail\":{error:?}}}");
            std::process::exit(1);
        }
    };
    eprintln!("{{\"event\":\"startup\",\"database_path\":{:?},\"configuration\":\"generated-none\",\"build\":{build_sha:?}}}", data_dir.display().to_string());
    let address = format!("0.0.0.0:{port}");
    let listener = tokio::net::TcpListener::bind(&address)
        .await
        .unwrap_or_else(|error| panic!("could not listen on {address}: {error}"));
    axum::serve(listener, app(state))
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap_or_else(|error| panic!("server error: {error}"));
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
}
