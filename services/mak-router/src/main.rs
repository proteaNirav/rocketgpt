use mak_router::api::health::health_endpoint;
use mak_router::config::RouterConfig;
use mak_router::services::stub::StubRouterKernel;

fn main() {
    let kernel = StubRouterKernel::new(RouterConfig::default());
    let report = health_endpoint(&kernel);

    println!(
        "{} listening on {} ({})",
        report.service_name, report.endpoint_path, report.status
    );
}
