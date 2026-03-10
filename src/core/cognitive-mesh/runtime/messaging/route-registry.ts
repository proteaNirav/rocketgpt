import type { RouteDefinition } from "./types/route";
import type { MeshTunnelType } from "./types/tunnel";

export class RouteRegistry {
  private readonly routes = new Map<string, RouteDefinition>();

  registerRoute(route: RouteDefinition): void {
    this.routes.set(route.routeId, route);
  }

  getRoute(routeId: string): RouteDefinition | undefined {
    return this.routes.get(routeId);
  }

  getAllRoutes(): RouteDefinition[] {
    return [...this.routes.values()];
  }

  getActiveRoutesByTunnel(tunnel: MeshTunnelType): RouteDefinition[] {
    return this.getAllRoutes().filter((route) => route.active && route.tunnel === tunnel);
  }
}
