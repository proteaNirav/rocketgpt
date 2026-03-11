use mak_task::api::health::health_endpoint;
use mak_task::config::TaskConfig;
use mak_task::services::stub::StubTaskKernel;

fn main() {
    let kernel = StubTaskKernel::new(TaskConfig::default());
    let report = health_endpoint(&kernel);

    println!(
        "{} listening on {} ({})",
        report.service_name, report.endpoint_path, report.status
    );
}
