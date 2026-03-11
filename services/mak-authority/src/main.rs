use mak_authority::api::health::health_endpoint;
use mak_authority::config::AuthorityConfig;
use mak_authority::services::stub::StubAuthorityKernel;

fn main() {
    let config = AuthorityConfig::default();
    let kernel = StubAuthorityKernel::new(config);
    let report = health_endpoint(&kernel);

    println!(
        "{} listening on {} ({})",
        report.service_name, report.endpoint_path, report.status
    );
}
