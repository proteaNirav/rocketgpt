use crate::services::interfaces::SurvivalKernel;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HealthReport {
    pub service_name: &'static str,
    pub endpoint_path: &'static str,
    pub status: &'static str,
}

pub fn health_endpoint(kernel: &impl SurvivalKernel) -> HealthReport {
    let _ = kernel.current_state();

    HealthReport {
        service_name: "mak-survival",
        endpoint_path: "/health",
        status: "ok",
    }
}
