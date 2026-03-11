use crate::domain::types::{
    AdaptiveFlowIntake, BacklogPressureReport, DependencyBlockingReport, Goal,
    ReassignmentDirective, RetryDirective, Task, TaskAssignment, TaskDependency,
    TaskFailureCluster, TaskLifecycle, TaskRoutingRequest, TaskRoutingResponse,
    TaskStatusEvent, TaskVerificationRecord,
};

pub trait GoalRegistry {
    fn register_goal(&self, goal: Goal) -> Result<(), &'static str>;
    fn get_goal(&self, goal_id: &str) -> Option<Goal>;
}

pub trait TaskRegistry {
    fn register_task(&self, task: Task) -> Result<(), &'static str>;
    fn get_task(&self, task_id: &str) -> Option<Task>;
}

pub trait DependencyTracker {
    fn register_dependency(&self, dependency: TaskDependency) -> Result<(), &'static str>;
    fn dependencies_for_task(&self, task_id: &str) -> Vec<TaskDependency>;
}

pub trait TaskLifecycleService {
    fn transition_task(
        &self,
        task_id: &str,
        lifecycle: TaskLifecycle,
    ) -> Result<TaskStatusEvent, &'static str>;
}

pub trait RetryService {
    fn request_retry(&self, directive: RetryDirective) -> Result<(), &'static str>;
}

pub trait ReassignmentService {
    fn reassign_task(
        &self,
        directive: ReassignmentDirective,
    ) -> Result<TaskAssignment, &'static str>;
}

pub trait VerificationService {
    fn record_verification(
        &self,
        verification: TaskVerificationRecord,
    ) -> Result<(), &'static str>;
}

pub trait AdaptiveTaskTelemetry {
    fn report_backlog_pressure(&self) -> Vec<BacklogPressureReport>;
    fn report_task_failure_clusters(&self) -> Vec<TaskFailureCluster>;
    fn report_dependency_blocking(&self) -> Vec<DependencyBlockingReport>;
}

pub trait TaskRouterHandoff {
    fn build_routing_request(&self, task_id: &str) -> Result<TaskRoutingRequest, &'static str>;
    fn apply_routing_response(
        &self,
        response: TaskRoutingResponse,
    ) -> Result<(), &'static str>;
}

pub trait AdaptiveFlowEmitter {
    fn emit_adaptive_flow(&self, intake: AdaptiveFlowIntake) -> Result<(), &'static str>;
}

pub trait TaskKernel:
    GoalRegistry
    + TaskRegistry
    + DependencyTracker
    + TaskLifecycleService
    + RetryService
    + ReassignmentService
    + VerificationService
    + AdaptiveTaskTelemetry
    + TaskRouterHandoff
    + AdaptiveFlowEmitter
{
    fn kernel_mode(&self) -> &'static str;
}
