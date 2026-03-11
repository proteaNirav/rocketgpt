use crate::services::interfaces::EvidenceKernel;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HealthReport {
    pub service_name: &'static str,
    pub endpoint_path: &'static str,
    pub status: &'static str,
}

pub fn health_endpoint(kernel: &impl EvidenceKernel) -> HealthReport {
    let _ = kernel.chain_mode();

    HealthReport {
        service_name: "mak-evidence",
        endpoint_path: "/health",
        status: "ok",
    }
}
