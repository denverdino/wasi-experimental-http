use anyhow::Error;
use std::time::Instant;
use wasi_cap_std_sync::WasiCtxBuilder;
use wasi_experimental_http_wasmtime::HttpCtx;
use wasmtime::*;
use wasmtime_wasi::Wasi;

fn main() {
    let allowed_domains = Some(vec![
        "http://127.0.0.1:3500".to_string(),
    ]);
    let module = "tests/dapr/build/optimized.wasm";
    create_instance(module.to_string(), allowed_domains.clone()).unwrap();
}

/// Create a Wasmtime::Instance from a compiled module and
/// link the WASI imports.
fn create_instance(
    filename: String,
    allowed_domains: Option<Vec<String>>,
) -> Result<Instance, Error> {
    let start = Instant::now();
    let store = Store::default();
    let mut linker = Linker::new(&store);

    let ctx = WasiCtxBuilder::new()
        .inherit_stdin()
        .inherit_stdout()
        .inherit_stderr()
        .build()?;

    let wasi = Wasi::new(&store, ctx);
    wasi.add_to_linker(&mut linker)?;
    // Link `wasi_experimental_http`
    let http = HttpCtx::new(allowed_domains, None)?;
    http.add_to_linker(&mut linker)?;

    let module = wasmtime::Module::from_file(store.engine(), filename)?;

    let instance = linker.instantiate(&module)?;
    let duration = start.elapsed();
    println!("module instantiation time: {:#?}", duration);
    Ok(instance)
}