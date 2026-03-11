use crate::services::interfaces::AuthorityKernel;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HealthReport {
    pub service_name: &'static str,
    pub endpoint_path: &'static str,
    pub status: &'static str,
}

pub fn health_endpoint(kernel: &impl AuthorityKernel) -> HealthReport {
    let _ = kernel.current_mode();

    HealthReport {
        service_name: "mak-authority",
        endpoint_path: "/health",
        status: "ok",
    }
}
