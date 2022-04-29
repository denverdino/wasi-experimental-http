use anyhow::Error;
use std::time::Instant;
use wasi_experimental_http_wasmtime::{HttpCtx, HttpState};
use wasmtime::*;
use wasmtime_wasi::sync::WasiCtxBuilder;
use wasmtime_wasi::*;

fn main() {
    let allowed_domains = Some(vec![
        "http://127.0.0.1:3500".to_string(),
    ]);
    let module = "tests/dapr/build/optimized.wasm";
    create_instance(module.to_string(), allowed_domains.clone(), None).unwrap();
}

/// Create a Wasmtime::Instance from a compiled module and
/// link the WASI imports.
fn create_instance(
    filename: String,
    allowed_hosts: Option<Vec<String>>,
    max_concurrent_requests: Option<u32>,
) -> Result<(Instance, Store<IntegrationTestsCtx>), Error> {
    let start = Instant::now();
    let engine = Engine::default();
    let mut linker = Linker::new(&engine);

    let wasi = WasiCtxBuilder::new()
        .inherit_stdin()
        .inherit_stdout()
        .inherit_stderr()
        .build();

    let http = HttpCtx {
        allowed_hosts,
        max_concurrent_requests,
    };

    let ctx = IntegrationTestsCtx { wasi, http };

    let mut store = Store::new(&engine, ctx);
    wasmtime_wasi::add_to_linker(
        &mut linker,
        |cx: &mut IntegrationTestsCtx| -> &mut WasiCtx { &mut cx.wasi },
    )?;

    // Link `wasi_experimental_http`
    let http = HttpState::new()?;
    http.add_to_linker(&mut linker, |cx: &IntegrationTestsCtx| -> &HttpCtx {
        &cx.http
    })?;

    let module = wasmtime::Module::from_file(store.engine(), filename)?;

    let instance = linker.instantiate(&mut store, &module)?;
    let duration = start.elapsed();
    println!("module instantiation time: {:#?}", duration);
    Ok((instance, store))
}

struct IntegrationTestsCtx {
    pub wasi: WasiCtx,
    pub http: HttpCtx,
}