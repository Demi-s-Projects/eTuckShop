export interface IUserRepository {
  getStaffUsers(): Promise<FirebaseFirestore.QueryDocumentSnapshot[]>;
}
