"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteRegistry = void 0;
class RouteRegistry {
    constructor() {
        this.routes = new Map();
    }
    registerRoute(route) {
        this.routes.set(route.routeId, route);
    }
    getRoute(routeId) {
        return this.routes.get(routeId);
    }
    getAllRoutes() {
        return [...this.routes.values()];
    }
    getActiveRoutesByTunnel(tunnel) {
        return this.getAllRoutes().filter((route) => route.active && route.tunnel === tunnel);
    }
}
exports.RouteRegistry = RouteRegistry;
