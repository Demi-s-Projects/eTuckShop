import { FirebaseInventoryRepository } from "@/repositories/firebase/FirebaseInventoryRepository";
import { FirebaseNotificationRepository } from "@/repositories/firebase/FirebaseNotificationRepository";
import { FirebaseOrderRepository } from "@/repositories/firebase/FirebaseOrderRepository";
import { FirebaseReportReadRepository } from "@/repositories/firebase/FirebaseReportReadRepository";
import { FirebaseUserRepository } from "@/repositories/firebase/FirebaseUserRepository";
import { InventoryApplicationService } from "@/application/inventory/InventoryApplicationService";
import { RequestAuthVerifier } from "@/infrastructure/auth/RequestAuthVerifier";
import { OrderApplicationService } from "@/application/orders/OrderApplicationService";
import { ReportApplicationService } from "@/application/reports/ReportApplicationService";

export class Container {
  private static instance: Container;

  readonly authVerifier: RequestAuthVerifier;
  readonly orderApplicationService: OrderApplicationService;
  readonly inventoryApplicationService: InventoryApplicationService;
  readonly reportApplicationService: ReportApplicationService;

  private constructor() {
    const userRepository = new FirebaseUserRepository();
    const notificationRepository = new FirebaseNotificationRepository(userRepository);

    this.authVerifier = new RequestAuthVerifier();
    const inventoryRepository = new FirebaseInventoryRepository();

    this.orderApplicationService = new OrderApplicationService(
      new FirebaseOrderRepository(),
      inventoryRepository,
      notificationRepository
    );

    this.inventoryApplicationService = new InventoryApplicationService(inventoryRepository);
    this.reportApplicationService = new ReportApplicationService(new FirebaseReportReadRepository());
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }
}
