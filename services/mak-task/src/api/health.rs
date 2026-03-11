use crate::services::interfaces::TaskKernel;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HealthReport {
    pub service_name: &'static str,
    pub endpoint_path: &'static str,
    pub status: &'static str,
}

pub fn health_endpoint(kernel: &impl TaskKernel) -> HealthReport {
    let _ = kernel.kernel_mode();

    HealthReport {
        service_name: "mak-task",
        endpoint_path: "/health",
        status: "ok",
    }
}
