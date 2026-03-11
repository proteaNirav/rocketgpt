use crate::services::interfaces::AwarenessKernel;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HealthReport {
    pub service_name: &'static str,
    pub endpoint_path: &'static str,
    pub status: &'static str,
}

pub fn health_endpoint(kernel: &impl AwarenessKernel) -> HealthReport {
    let _ = kernel.self_state();

    HealthReport {
        service_name: "mak-awareness",
        endpoint_path: "/health",
        status: "ok",
    }
}
