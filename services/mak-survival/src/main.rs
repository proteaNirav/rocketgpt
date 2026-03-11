use mak_survival::api::health::health_endpoint;
use mak_survival::config::SurvivalConfig;
use mak_survival::services::stub::StubSurvivalKernel;

fn main() {
    let kernel = StubSurvivalKernel::new(SurvivalConfig::default());
    let report = health_endpoint(&kernel);

    println!(
        "{} listening on {} ({})",
        report.service_name, report.endpoint_path, report.status
    );
}
