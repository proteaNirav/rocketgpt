export type NotifyLevel = "info" | "success" | "warning" | "error";

export type NotifyEvent = {
  id: string;
  title: string;
  message: string;
  level: NotifyLevel;
  createdAt: string;
};

type NotifyListener = (event: NotifyEvent) => void;

const listeners = new Set<NotifyListener>();

function makeId(): string {
  return `notify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function publishNotification(input: Omit<NotifyEvent, "id" | "createdAt">): NotifyEvent {
  const event: NotifyEvent = {
    ...input,
    id: makeId(),
    createdAt: new Date().toISOString(),
  };

  listeners.forEach((listener) => listener(event));
  return event;
}

export function subscribeNotifications(listener: NotifyListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
