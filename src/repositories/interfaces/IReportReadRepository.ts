export interface IReportReadRepository {
  getCompletedOrdersInRange(start: Date, end: Date): Promise<FirebaseFirestore.QuerySnapshot>;
  getInventoryLowercase(): Promise<FirebaseFirestore.QuerySnapshot>;
  getInventoryCapitalized(): Promise<FirebaseFirestore.QuerySnapshot>;
}
