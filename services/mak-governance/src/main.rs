use mak_governance::api::health::health_endpoint;
use mak_governance::config::GovernanceConfig;
use mak_governance::services::stub::StubGovernanceKernel;

fn main() {
    let kernel = StubGovernanceKernel::new(GovernanceConfig::default());
    let report = health_endpoint(&kernel);

    println!(
        "{} listening on {} ({})",
        report.service_name, report.endpoint_path, report.status
    );
}
