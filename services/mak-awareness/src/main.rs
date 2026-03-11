use mak_awareness::api::health::health_endpoint;
use mak_awareness::config::AwarenessConfig;
use mak_awareness::services::stub::StubAwarenessKernel;

fn main() {
    let kernel = StubAwarenessKernel::new(AwarenessConfig::default());
    let report = health_endpoint(&kernel);

    println!(
        "{} listening on {} ({})",
        report.service_name, report.endpoint_path, report.status
    );
}
