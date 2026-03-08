export interface RouteHealth {
  routeId: string;
  heartbeatAt?: string;
  failureCount: number;
  lastFailure?: string;
}

export interface VehicleHealth {
  vehicleId: string;
  heartbeatAt?: string;
  active: boolean;
}

export class TransportHealthRegistry {
  private readonly routeHealth = new Map<string, RouteHealth>();
  private readonly vehicleHealth = new Map<string, VehicleHealth>();

  markRouteHeartbeat(routeId: string): void {
    const current = this.routeHealth.get(routeId);
    this.routeHealth.set(routeId, {
      routeId,
      heartbeatAt: new Date().toISOString(),
      failureCount: current?.failureCount ?? 0,
      lastFailure: current?.lastFailure,
    });
  }

  markRouteFailure(routeId: string, reason: string): void {
    const current = this.routeHealth.get(routeId);
    this.routeHealth.set(routeId, {
      routeId,
      heartbeatAt: current?.heartbeatAt,
      failureCount: (current?.failureCount ?? 0) + 1,
      lastFailure: `${new Date().toISOString()}: ${reason}`,
    });
  }

  registerVehicleHeartbeat(vehicleId: string, active: boolean): void {
    this.vehicleHealth.set(vehicleId, {
      vehicleId,
      heartbeatAt: new Date().toISOString(),
      active,
    });
  }

  getRouteHealthSnapshot(): RouteHealth[] {
    return [...this.routeHealth.values()];
  }

  getVehicleHealthSnapshot(): VehicleHealth[] {
    return [...this.vehicleHealth.values()];
  }
}
