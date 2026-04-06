import type { CreateOrderRequest, Order, OrderItem, UpdateOrderRequest } from "@/types/Order";
import type { InventoryStatus } from "@/domain/enums/InventoryStatus";
import type { IOrderRepository } from "@/repositories/interfaces/IOrderRepository";
import type { IInventoryRepository } from "@/repositories/interfaces/IInventoryRepository";
import type { INotificationRepository } from "@/repositories/interfaces/INotificationRepository";
import type { AuthenticatedUser } from "@/infrastructure/auth/RequestAuthVerifier";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number; details?: unknown };

type InventoryErrorType = "insufficient_stock" | "item_not_found" | "processing_error";

interface InventoryError {
  type: InventoryErrorType;
  itemName: string;
  message: string;
  requested?: number;
  available?: number;
}

export class OrderApplicationService {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly inventoryRepository: IInventoryRepository,
    private readonly notificationRepository: INotificationRepository
  ) {}

  async getOrders(
    currentUser: AuthenticatedUser,
    query: { orderId?: string | null; userId?: string | null }
  ): Promise<ServiceResult<{ order?: Order; orders?: Order[] }>> {
    const orderId = query.orderId || null;
    const userId = query.userId || null;

    if (userId && currentUser.role === "customer" && userId !== currentUser.uid) {
      return {
        ok: false,
        error: "Forbidden: Cannot view other users' orders",
        status: 403,
      };
    }

    if (orderId) {
      const orderIdNum = parseInt(orderId, 10);
      const found = await this.orderRepository.getByOrderId(orderIdNum);
      if (!found) {
        return { ok: false, error: "Order not found", status: 404 };
      }
      return { ok: true, data: { order: found.order } };
    }

    if (userId) {
      const orders = await this.orderRepository.getByUserId(userId);
      return { ok: true, data: { orders } };
    }

    const orders = await this.orderRepository.getAll();
    return { ok: true, data: { orders } };
  }

  async createOrder(
    currentUser: AuthenticatedUser,
    body: CreateOrderRequest
  ): Promise<ServiceResult<{ success: true; orderId: number; documentId: string }>> {
    if (!body.userId || !body.displayName || !body.OrderContents) {
      return {
        ok: false,
        error: "userId, displayName, and OrderContents are required",
        status: 400,
      };
    }

    if (currentUser.role === "customer" && body.userId !== currentUser.uid) {
      return {
        ok: false,
        error: "Forbidden: Cannot create orders for other users",
        status: 403,
      };
    }

    if (!Array.isArray(body.OrderContents) || body.OrderContents.length === 0) {
      return {
        ok: false,
        error: "OrderContents must be a non-empty array of items",
        status: 400,
      };
    }

    const stockResult = await this.deductInventoryStock(body.OrderContents);
    if (!stockResult.success) {
      return {
        ok: false,
        error: this.formatInventoryErrorMessage(stockResult.errors),
        details: stockResult.errors,
        status: 400,
      };
    }

    const created = await this.orderRepository.create({
      userId: body.userId,
      displayName: body.displayName,
      orderContents: body.OrderContents,
      totalPrice: stockResult.calculatedPrice ?? 0,
      status: "pending",
    });

    this.notificationRepository
      .notifyStaff("new-order", {
        message: `New order #${created.orderId} placed by ${body.displayName}`,
        orderId: created.orderId,
      })
      .catch((err) => console.error("Notification error:", err));

    if (stockResult.stockStatusChanges && stockResult.stockStatusChanges.length > 0) {
      this.notifyStockChanges(stockResult.stockStatusChanges).catch((err) =>
        console.error("Stock notification error:", err)
      );
    }

    try {
      await this.notificationRepository.notifyCustomer(
        body.userId,
        "order-confirmation",
        `Your order #${created.orderId} was placed successfully.`,
        created.orderId
      );
    } catch (err) {
      console.error("Failed to send customer confirmation notification:", err);
    }

    return {
      ok: true,
      data: {
        success: true,
        orderId: created.orderId,
        documentId: created.documentId,
      },
    };
  }

  async updateOrder(
    currentUser: AuthenticatedUser,
    body: UpdateOrderRequest
  ): Promise<ServiceResult<{ success: true; orderId: number }>> {
    if (body.OrderID === undefined || body.OrderID === null) {
      return { ok: false, error: "OrderID is required", status: 400 };
    }

    const found = await this.orderRepository.getByOrderId(body.OrderID);
    if (!found) {
      return { ok: false, error: "Order not found", status: 404 };
    }

    const currentOrder = found.order;

    if (currentUser.role === "customer") {
      if (currentOrder.userId !== currentUser.uid) {
        return {
          ok: false,
          error: "Forbidden: Cannot modify other users' orders",
          status: 403,
        };
      }

      if (body.status && body.status !== "cancelled") {
        return {
          ok: false,
          error: "Forbidden: Customers can only cancel orders",
          status: 403,
        };
      }

      if (currentOrder.status !== "pending") {
        return {
          ok: false,
          error: "Cannot cancel an order that is already being processed",
          status: 400,
        };
      }
    }

    const updateData: Partial<Pick<Order, "displayName" | "OrderContents" | "TotalPrice" | "status">> = {};

    if (body.displayName !== undefined) updateData.displayName = body.displayName;
    if (body.OrderContents !== undefined) updateData.OrderContents = body.OrderContents;
    if (body.TotalPrice !== undefined) updateData.TotalPrice = body.TotalPrice;
    if (body.status !== undefined) updateData.status = body.status;

    if (Object.keys(updateData).length === 0) {
      return { ok: false, error: "No fields to update", status: 400 };
    }

    if (
      body.status === "cancelled" &&
      currentOrder.status !== "cancelled" &&
      currentOrder.status !== "cancelled-acknowledged"
    ) {
      const restoreResult = await this.restoreInventoryStock(currentOrder.OrderContents);
      if (!restoreResult.success) {
        console.warn(
          `Failed to restore inventory for order ${body.OrderID}: ${restoreResult.error}`
        );
      }
    }

    await this.orderRepository.updateByDocumentId(found.id, updateData);

    if (body.status !== undefined && body.status !== currentOrder.status) {
      const actorName = currentUser.name || currentUser.email?.split("@")[0] || "staff";

      let staffMessage = `Order #${body.OrderID} status changed to ${body.status}`;
      if (body.status === "cancelled" && currentUser.role === "customer") {
        staffMessage = `Order #${body.OrderID} was cancelled by the customer.`;
      } else if (currentUser.role !== "customer") {
        staffMessage = `Order #${body.OrderID} status changed to ${body.status} by ${actorName}`;
      }

      this.notificationRepository
        .notifyStaff("order-status", { message: staffMessage, orderId: body.OrderID })
        .catch((err) => console.error("Staff notification error:", err));

      try {
        await this.notificationRepository.notifyCustomer(
          currentOrder.userId,
          "order-status",
          `Your order #${body.OrderID} status changed to ${body.status}`,
          body.OrderID
        );
      } catch (err) {
        console.error("Failed to send customer status notification:", err);
      }
    }

    return { ok: true, data: { success: true, orderId: body.OrderID } };
  }

  async deleteOrder(
    currentUser: AuthenticatedUser,
    query: { orderId?: string | null }
  ): Promise<ServiceResult<{ success: true; orderId: number }>> {
    if (currentUser.role !== "employee" && currentUser.role !== "owner") {
      return {
        ok: false,
        error: "Forbidden: Employee or Owner access required",
        status: 403,
      };
    }

    const orderId = query.orderId;
    if (!orderId) {
      return {
        ok: false,
        error: "orderId query parameter is required",
        status: 400,
      };
    }

    const orderIdNum = parseInt(orderId, 10);
    const deleted = await this.orderRepository.deleteByOrderId(orderIdNum);

    if (!deleted) {
      return { ok: false, error: "Order not found", status: 404 };
    }

    return { ok: true, data: { success: true, orderId: orderIdNum } };
  }

  private async deductInventoryStock(orderItems: OrderItem[]): Promise<{
    success: boolean;
    errors: InventoryError[];
    calculatedPrice?: number;
    stockStatusChanges?: Array<{
      itemId: string;
      itemName: string;
      oldStatus: InventoryStatus;
      newStatus: InventoryStatus;
      newQuantity: number;
      minStockThreshold: number;
    }>;
  }> {
    const errors: InventoryError[] = [];
    const updates: Array<{ ref: unknown; data: Record<string, unknown> }> = [];
    let calculatedPrice = 0;
    const stockStatusChanges: Array<{
      itemId: string;
      itemName: string;
      oldStatus: InventoryStatus;
      newStatus: InventoryStatus;
      newQuantity: number;
      minStockThreshold: number;
    }> = [];

    try {
      const inventoryMap = await this.inventoryRepository.getByIds(
        orderItems.map((item) => item.itemId)
      );

      for (const item of orderItems) {
        const inventoryDoc = inventoryMap.get(item.itemId);

        if (!inventoryDoc || !inventoryDoc.exists) {
          errors.push({
            type: "item_not_found",
            itemName: item.name,
            message: `"${item.name}" is no longer available in our inventory.`,
          });
          continue;
        }

        const inventoryData = inventoryDoc.data();
        const currentQuantity = inventoryData?.quantity ?? 0;
        const minStockThreshold = inventoryData?.minStockThreshold ?? 10;
        const itemPrice = inventoryData?.price ?? 0;
        const newQuantity = Math.max(0, currentQuantity - item.quantity);

        const oldStatus = this.inventoryRepository.calculateStatus(
          currentQuantity,
          minStockThreshold
        );
        const newStatus = this.inventoryRepository.calculateStatus(
          newQuantity,
          minStockThreshold
        );

        calculatedPrice += itemPrice * item.quantity;

        if (currentQuantity < item.quantity) {
          errors.push({
            type: "insufficient_stock",
            itemName: item.name,
            requested: item.quantity,
            available: currentQuantity,
            message:
              currentQuantity === 0
                ? `"${item.name}" is out of stock.`
                : `Only ${currentQuantity} "${item.name}" available, but you requested ${item.quantity}.`,
          });
          continue;
        }

        if (oldStatus !== newStatus) {
          stockStatusChanges.push({
            itemId: item.itemId,
            itemName: item.name,
            oldStatus,
            newStatus,
            newQuantity,
            minStockThreshold,
          });
        }

        updates.push({
          ref: inventoryDoc.ref,
          data: {
            quantity: newQuantity,
            status: newStatus,
            lastUpdated: new Date().toISOString(),
          },
        });
      }
    } catch {
      return {
        success: false,
        errors: [
          {
            type: "processing_error",
            itemName: "Order",
            message: "Failed to verify inventory. Please try again.",
          },
        ],
      };
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    try {
      await this.inventoryRepository.commitBatchUpdate(updates);
      return { success: true, errors: [], calculatedPrice, stockStatusChanges };
    } catch {
      return {
        success: false,
        errors: [
          {
            type: "processing_error",
            itemName: "Order",
            message: "Failed to update inventory. Please try again.",
          },
        ],
      };
    }
  }

  private async restoreInventoryStock(
    orderItems: OrderItem[]
  ): Promise<{ success: boolean; error?: string }> {
    const updates: Array<{ ref: unknown; data: Record<string, unknown> }> = [];

    try {
      const inventoryMap = await this.inventoryRepository.getByIds(
        orderItems.map((item) => item.itemId)
      );

      for (const item of orderItems) {
        const inventoryDoc = inventoryMap.get(item.itemId);
        if (!inventoryDoc || !inventoryDoc.exists) {
          console.warn(
            `Cannot restore stock for "${item.name}" (${item.itemId}) - item not found in inventory`
          );
          continue;
        }

        const inventoryData = inventoryDoc.data();
        const currentQuantity = inventoryData?.quantity ?? 0;
        const minStockThreshold = inventoryData?.minStockThreshold ?? 10;
        const newQuantity = currentQuantity + item.quantity;
        const newStatus = this.inventoryRepository.calculateStatus(
          newQuantity,
          minStockThreshold
        );

        updates.push({
          ref: inventoryDoc.ref,
          data: {
            quantity: newQuantity,
            status: newStatus,
            lastUpdated: new Date().toISOString(),
          },
        });
      }
    } catch (err) {
      console.error("Error reading inventory for restoration:", err);
      return {
        success: false,
        error: "Failed to read inventory for restoration.",
      };
    }

    try {
      await this.inventoryRepository.commitBatchUpdate(updates);
      return { success: true };
    } catch (err) {
      console.error("Failed to restore inventory:", err);
      return {
        success: false,
        error: "Failed to restore inventory stock.",
      };
    }
  }

  private formatInventoryErrorMessage(errors: InventoryError[]): string {
    const stockErrors = errors.filter((e) => e.type === "insufficient_stock");
    const notFoundErrors = errors.filter((e) => e.type === "item_not_found");
    const otherErrors = errors.filter((e) => e.type === "processing_error");

    const messages: string[] = [];

    if (stockErrors.length > 0) {
      messages.push(stockErrors.map((e) => e.message).join(" "));
    }

    if (notFoundErrors.length > 0) {
      const itemNames = notFoundErrors.map((e) => `"${e.itemName}"`).join(", ");
      messages.push(`The following item(s) are no longer available: ${itemNames}.`);
    }

    if (otherErrors.length > 0) {
      messages.push("Some items could not be processed. Please try again.");
    }

    return messages.join(" ") || "Unable to process your order.";
  }

  private async notifyStockChanges(
    stockStatusChanges: Array<{
      itemId: string;
      itemName: string;
      oldStatus: InventoryStatus;
      newStatus: InventoryStatus;
      newQuantity: number;
      minStockThreshold: number;
    }>
  ): Promise<void> {
    for (const change of stockStatusChanges) {
      if (change.newStatus !== "out of stock" && change.newStatus !== "low stock") {
        continue;
      }

      const statusLabel = change.newStatus === "out of stock" ? "OUT OF STOCK" : "LOW STOCK";
      const message = `⚠️ ${change.itemName}: ${statusLabel} (${change.newQuantity} remaining)`;

      await this.notificationRepository.notifyStaff("inventory-alert", {
        message,
        itemId: change.itemId,
        itemName: change.itemName,
        status: change.newStatus,
        quantity: change.newQuantity,
      });
    }
  }
}
