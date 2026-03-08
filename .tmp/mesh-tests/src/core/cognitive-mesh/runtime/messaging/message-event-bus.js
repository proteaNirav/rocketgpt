"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageEventBus = void 0;
const node_events_1 = require("node:events");
class MessageEventBus {
    constructor() {
        this.emitter = new node_events_1.EventEmitter();
    }
    on(eventName, listener) {
        this.emitter.on(eventName, listener);
    }
    emit(eventName, payload) {
        this.emitter.emit(eventName, payload);
    }
}
exports.MessageEventBus = MessageEventBus;
