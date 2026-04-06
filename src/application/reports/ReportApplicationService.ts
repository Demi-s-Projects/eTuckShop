import type { AuthenticatedUser } from "@/infrastructure/auth/RequestAuthVerifier";
import type { IReportReadRepository } from "@/repositories/interfaces/IReportReadRepository";

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

interface SalesReportItem {
  name: string;
  itemId: string;
  quantity: number;
  priceAtPurchase: number;
}

interface SalesRow {
  OrderDate: string;
  OrderTime: string;
  Customer: string;
  Items?: SalesReportItem[];
  ItemNames: string;
  ItemCount: number;
  Sale: number;
  Profit?: number;
}

export class ReportApplicationService {
  constructor(private readonly reportReadRepository: IReportReadRepository) {}

  private ensureOwner(user: AuthenticatedUser): Result<null> {
    if (user.role !== "owner") {
      return { ok: false, error: "Invalid role", status: 400 };
    }
    return { ok: true, data: null };
  }

  async generateSalesReport(
    user: AuthenticatedUser,
    query: { startDate?: string | null; endDate?: string | null; timeZone?: string | null }
  ): Promise<Result<{ data: SalesRow[] }>> {
    const access = this.ensureOwner(user);
    if (!access.ok) return access;

    const startDate = query.startDate || null;
    const endDate = query.endDate || null;
    const timezone = query.timeZone || null;

    if (!startDate || !endDate) {
      return { ok: false, error: "Missing date range", status: 400 };
    }

    if (timezone && !this.isValidTimezone(timezone)) {
      return { ok: false, error: "Invalid Timezone", status: 400 };
    }

    const start = new Date(`${startDate}T00:00:00.000`);
    const end = new Date(`${endDate}T23:59:59.999`);

    const ordersSnap = await this.reportReadRepository.getCompletedOrdersInRange(start, end);

    const orders: SalesRow[] = [];

    ordersSnap.forEach((doc: any) => {
      const data = doc.data() as Record<string, any>;
      const jsDate = data.OrderTime?.toDate?.();

      const OrderDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone ?? undefined,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(jsDate);

      const OrderTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone ?? undefined,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(jsDate);

      const contents = (data.OrderContents || []) as SalesReportItem[];

      orders.push({
        OrderDate,
        OrderTime,
        Customer: data.displayName || "",
        Items: contents,
        ItemNames: contents.map((item) => item.name).join(", "),
        ItemCount: contents.length || 0,
        Sale: data.TotalPrice || 0,
      });
    });

    const inventorySnap = await this.reportReadRepository.getInventoryLowercase();
    const inventoryMap: Record<string, any> = {};
    inventorySnap.forEach((doc: any) => {
      inventoryMap[doc.id] = doc.data();
    });

    for (const order of orders) {
      let orderProfit = 0;
      for (const item of order.Items || []) {
        const inv = inventoryMap[item.itemId];
        if (!inv) continue;
        const cost = inv.costPrice;
        const sell = item.priceAtPurchase;
        const qty = item.quantity;
        orderProfit += (sell - cost) * qty;
      }
      order.Profit = orderProfit;
    }

    orders.forEach((order) => {
      delete order.Items;
    });

    return { ok: true, data: { data: orders } };
  }

  async generateItemsReport(
    user: AuthenticatedUser,
    query: { startDate?: string | null; endDate?: string | null }
  ): Promise<Result<{ data: unknown[] }>> {
    const access = this.ensureOwner(user);
    if (!access.ok) return access;

    const startDate = query.startDate || null;
    const endDate = query.endDate || null;

    if (!startDate || !endDate) {
      const snapshot = await this.reportReadRepository.getInventoryCapitalized();
      const items: unknown[] = [];

      snapshot.forEach((doc: any) => {
        const data = doc.data() as Record<string, unknown>;
        items.push({
          itemID: doc.id,
          name: data.name || "",
          category: data.category || "",
          price: data.price || 0,
          quantity: data.quantity || 0,
          description: data.description || "",
          costPrice: data.costPrice ?? null,
          status: data.status || null,
        });
      });

      return { ok: true, data: { data: items } };
    }

    const start = new Date(`${startDate}T00:00:00.000`);
    const end = new Date(`${endDate}T23:59:59.999`);

    const ordersSnap = await this.reportReadRepository.getCompletedOrdersInRange(start, end);

    type AggRow = {
      itemId: string;
      name: string;
      orderIds: Set<string>;
      totalQuantity: number;
      revenue: number;
    };

    const agg: Record<string, AggRow> = {};

    ordersSnap.forEach((doc: any) => {
      const data = doc.data() as Record<string, any>;
      const orderId = String(data.OrderID ?? doc.id);
      const contents = data.OrderContents || [];

      for (const it of contents) {
        const id = it.itemId || it.itemID || String(it.itemId || "");
        if (!id) continue;

        const name = it.name || "";
        const qty = Number(it.quantity ?? 0);
        const priceAtPurchase = Number(it.priceAtPurchase ?? it.price ?? 0);

        if (!agg[id]) {
          agg[id] = {
            itemId: id,
            name,
            orderIds: new Set(),
            totalQuantity: 0,
            revenue: 0,
          };
        }

        agg[id].orderIds.add(orderId);
        agg[id].totalQuantity += qty;
        agg[id].revenue += priceAtPurchase * qty;
      }
    });

    let inventorySnap = await this.reportReadRepository.getInventoryLowercase();
    if (inventorySnap.empty) {
      inventorySnap = await this.reportReadRepository.getInventoryCapitalized();
    }

    const inventoryMap: Record<string, any> = {};
    inventorySnap.forEach((doc: any) => {
      inventoryMap[doc.id] = doc.data();
    });

    const results = Object.values(agg).map((r) => {
      const inv = inventoryMap[r.itemId];
      const costPrice = inv?.costPrice ?? null;
      const costTotal = costPrice != null ? Number(costPrice) * r.totalQuantity : null;
      const profit = costTotal != null ? r.revenue - costTotal : null;

      return {
        Name: r.name || inv?.name || null,
        Sales: r.orderIds.size,
        BasePrice: inv?.price ?? null,
        CostPrice: costPrice != null ? Number(costPrice) : null,
        CostTotal: costTotal != null ? Number(costTotal) : null,
        Revenue: Number(r.revenue),
        Profit: profit != null ? Number(profit) : null,
        CurrentStock: inv?.quantity ?? null,
        Category: inv?.category ?? null,
        Status: inv?.status ?? null,
      };
    });

    return { ok: true, data: { data: results } };
  }

  private isValidTimezone(tz: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }
}
