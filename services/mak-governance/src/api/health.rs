use crate::services::interfaces::GovernanceKernel;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HealthReport {
    pub service_name: &'static str,
    pub endpoint_path: &'static str,
    pub status: &'static str,
}

pub fn health_endpoint(kernel: &impl GovernanceKernel) -> HealthReport {
    let _ = kernel.current_mode();

    HealthReport {
        service_name: "mak-governance",
        endpoint_path: "/health",
        status: "ok",
    }
}
