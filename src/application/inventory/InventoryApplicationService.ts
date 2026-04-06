import type { AuthenticatedUser } from "@/infrastructure/auth/RequestAuthVerifier";
import type { IInventoryRepository } from "@/repositories/interfaces/IInventoryRepository";

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

export class InventoryApplicationService {
  constructor(private readonly inventoryRepository: IInventoryRepository) {}

  private ensureStaff(user: AuthenticatedUser): Result<null> {
    if (user.role !== "employee" && user.role !== "owner") {
      return { ok: false, error: "Forbidden: Employee or Owner access required", status: 403 };
    }
    return { ok: true, data: null };
  }

  async getAll(user: AuthenticatedUser): Promise<Result<{ items: Array<Record<string, unknown>> }>> {
    const access = this.ensureStaff(user);
    if (!access.ok) return access;

    const items = await this.inventoryRepository.getAllItems();
    return { ok: true, data: { items } };
  }

  async create(
    user: AuthenticatedUser,
    body: Record<string, unknown>
  ): Promise<Result<{ message: string; itemId: string; item: Record<string, unknown> }>> {
    const access = this.ensureStaff(user);
    if (!access.ok) return access;

    const name = body.name as string | undefined;
    const description = body.description as string | undefined;
    const category = body.category as string | undefined;
    const price = body.price as number | string | undefined;
    const costPrice = body.costPrice as number | string | undefined;
    const quantity = body.quantity as number | string | undefined;
    const minStockThreshold = body.minStockThreshold as number | undefined;

    if (!name || !category || price === undefined || quantity === undefined) {
      return {
        ok: false,
        error: "Missing required fields: name, category, price, quantity",
        status: 400,
      };
    }

    if (Number(quantity) < 0 || Number(price) < 0) {
      return {
        ok: false,
        error: "Quantity and price must be non-negative",
        status: 400,
      };
    }

    let status = "in stock";
    const threshold = minStockThreshold || 10;

    if (Number(quantity) === 0) {
      status = "out of stock";
    } else if (Number(quantity) <= threshold) {
      status = "low stock";
    }

    const newItem = {
      name: name.trim(),
      description: description?.trim() || "",
      category,
      price: parseFloat(String(price)),
      costPrice: parseFloat(String(costPrice ?? 0)) || 0,
      quantity: parseInt(String(quantity), 10),
      minStockThreshold: threshold,
      status,
      lastUpdated: new Date().toISOString(),
      updatedBy: user.uid,
    };

    const itemId = await this.inventoryRepository.createItem(newItem);

    return {
      ok: true,
      data: {
        message: "Item added successfully",
        itemId,
        item: newItem,
      },
    };
  }

  async getOne(
    user: AuthenticatedUser,
    itemId: string
  ): Promise<Result<{ id: string } & Record<string, unknown>>> {
    const access = this.ensureStaff(user);
    if (!access.ok) return access;

    const item = await this.inventoryRepository.getItemById(itemId);
    if (!item) {
      return { ok: false, error: "Item not found", status: 404 };
    }

    return { ok: true, data: { id: item.id, ...item.data } };
  }

  async update(
    user: AuthenticatedUser,
    itemId: string,
    body: Record<string, unknown>
  ): Promise<Result<{ message: string; item: { id: string } & Record<string, unknown> }>> {
    const access = this.ensureStaff(user);
    if (!access.ok) return access;

    const existing = await this.inventoryRepository.getItemById(itemId);
    if (!existing) {
      return { ok: false, error: "Item not found", status: 404 };
    }

    const name = body.name as string | undefined;
    const description = body.description as string | undefined;
    const category = body.category as string | undefined;
    const price = body.price as number | string | undefined;
    const costPrice = body.costPrice as number | string | undefined;
    const quantity = body.quantity as number | string | undefined;
    const minStockThreshold = body.minStockThreshold as number | undefined;

    if (quantity !== undefined && Number(quantity) < 0) {
      return { ok: false, error: "Quantity cannot be negative", status: 400 };
    }

    if (price !== undefined && Number(price) < 0) {
      return { ok: false, error: "Price cannot be negative", status: 400 };
    }

    if (costPrice !== undefined && Number(costPrice) < 0) {
      return { ok: false, error: "Cost cannot be negative", status: 400 };
    }

    if (!name) {
      return { ok: false, error: "Name field cannot be empty", status: 400 };
    }

    if (minStockThreshold !== undefined && minStockThreshold < 0) {
      return { ok: false, error: "Minimum stock cannot be negative", status: 400 };
    }

    const updates: Record<string, unknown> = {
      lastUpdated: new Date().toISOString(),
      updatedBy: user.uid,
    };

    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (category !== undefined) updates.category = category;
    if (price !== undefined) updates.price = parseFloat(String(price));
    if (costPrice !== undefined) updates.costPrice = parseFloat(String(costPrice));

    if (quantity !== undefined) {
      const parsedQty = parseInt(String(quantity), 10);
      updates.quantity = parsedQty;

      const existingData = existing.data;
      const threshold =
        minStockThreshold ||
        Number(existingData.minStockThreshold as number | undefined) ||
        Number(existingData.minStock as number | undefined) ||
        10;

      if (parsedQty === 0) {
        updates.status = "out of stock";
      } else if (parsedQty <= threshold) {
        updates.status = "low stock";
      } else {
        updates.status = "in stock";
      }
    }

    if (minStockThreshold !== undefined) {
      updates.minStockThreshold = minStockThreshold;
    }

    await this.inventoryRepository.updateItem(itemId, updates);

    const updated = await this.inventoryRepository.getItemById(itemId);
    if (!updated) {
      return { ok: false, error: "Failed to update item", status: 500 };
    }

    return {
      ok: true,
      data: {
        message: "Item updated successfully",
        item: { id: updated.id, ...updated.data },
      },
    };
  }

  async remove(user: AuthenticatedUser, itemId: string): Promise<Result<{ message: string }>> {
    const access = this.ensureStaff(user);
    if (!access.ok) return access;

    const existing = await this.inventoryRepository.getItemById(itemId);
    if (!existing) {
      return { ok: false, error: "Item not found", status: 404 };
    }

    await this.inventoryRepository.deleteItem(itemId);

    return {
      ok: true,
      data: { message: "Item deleted successfully" },
    };
  }
}
