use mak_evidence::api::health::health_endpoint;
use mak_evidence::config::EvidenceConfig;
use mak_evidence::services::stub::StubEvidenceKernel;

fn main() {
    let kernel = StubEvidenceKernel::new(EvidenceConfig::default());
    let report = health_endpoint(&kernel);

    println!(
        "{} listening on {} ({})",
        report.service_name, report.endpoint_path, report.status
    );
}
