import { EventEmitter } from "node:events";
import type { CognitiveParcel } from "./types/parcel";
import type { DeliveryReceipt } from "./types/receipt";
import type { RouteDefinition } from "./types/route";
import type { MeshVehicle } from "./types/vehicle";

export interface MessagingEvents {
  routeStarted: { route: RouteDefinition };
  routeHeartbeat: { routeId: string; at: string };
  parcelQueued: { parcel: CognitiveParcel; stopId: string };
  parcelPicked: { parcel: CognitiveParcel; routeId: string; stopId: string };
  parcelDelivered: { parcel: CognitiveParcel; routeId?: string; receipt: DeliveryReceipt };
  parcelRejected: { parcel: CognitiveParcel; reason: string };
  vehicleDispatched: { parcel: CognitiveParcel; vehicle: MeshVehicle };
  receiptCreated: { receipt: DeliveryReceipt };
}

export class MessageEventBus {
  private readonly emitter = new EventEmitter();

  on<K extends keyof MessagingEvents>(eventName: K, listener: (payload: MessagingEvents[K]) => void): void {
    this.emitter.on(eventName, listener as (...args: unknown[]) => void);
  }

  emit<K extends keyof MessagingEvents>(eventName: K, payload: MessagingEvents[K]): void {
    this.emitter.emit(eventName, payload);
  }
}
