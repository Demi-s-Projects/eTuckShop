import type { InventoryStatus } from "@/domain/enums/InventoryStatus";

export class InventoryItemEntity {
  constructor(
    private readonly idValue: string,
    private readonly nameValue: string,
    private quantityValue: number,
    private readonly minStockThresholdValue: number
  ) {}

  get id(): string {
    return this.idValue;
  }

  get name(): string {
    return this.nameValue;
  }

  get quantity(): number {
    return this.quantityValue;
  }

  get minStockThreshold(): number {
    return this.minStockThresholdValue;
  }

  get status(): InventoryStatus {
    if (this.quantityValue <= 0) return "out of stock";
    if (this.quantityValue <= this.minStockThresholdValue) return "low stock";
    return "in stock";
  }

  canDeduct(amount: number): boolean {
    return this.quantityValue >= amount;
  }

  deduct(amount: number): void {
    this.quantityValue = Math.max(0, this.quantityValue - amount);
  }

  restore(amount: number): void {
    this.quantityValue += amount;
  }
}
