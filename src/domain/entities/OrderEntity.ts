import type { OrderItem } from "@/types/Order";
import type { OrderStatus } from "@/domain/enums/OrderStatus";

export class OrderEntity {
  constructor(
    private readonly orderIdValue: number,
    private readonly userIdValue: string,
    private readonly displayNameValue: string,
    private readonly itemsValue: OrderItem[],
    private statusValue: OrderStatus
  ) {}

  get orderId(): number {
    return this.orderIdValue;
  }

  get userId(): string {
    return this.userIdValue;
  }

  get displayName(): string {
    return this.displayNameValue;
  }

  get items(): readonly OrderItem[] {
    return Object.freeze([...this.itemsValue]);
  }

  get status(): OrderStatus {
    return this.statusValue;
  }

  isOwnedBy(userId: string): boolean {
    return this.userIdValue === userId;
  }

  canCancelByCustomer(): boolean {
    return this.statusValue === "pending";
  }

  transitionTo(nextStatus: OrderStatus): { ok: true } | { ok: false; error: string } {
    const current = this.statusValue;

    if (current === nextStatus) {
      return { ok: true };
    }

    const allowed: Record<OrderStatus, OrderStatus[]> = {
      pending: ["in-progress", "cancelled"],
      "in-progress": ["completed", "cancelled"],
      completed: [],
      cancelled: ["cancelled-acknowledged"],
      "cancelled-acknowledged": [],
    };

    if (!allowed[current].includes(nextStatus)) {
      return {
        ok: false,
        error: `Invalid status transition from ${current} to ${nextStatus}`,
      };
    }

    this.statusValue = nextStatus;
    return { ok: true };
  }
}
