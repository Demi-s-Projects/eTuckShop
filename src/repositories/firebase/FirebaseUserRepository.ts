import { adminDB } from "@/firebase/admin";
import type { IUserRepository } from "@/repositories/interfaces/IUserRepository";

export class FirebaseUserRepository implements IUserRepository {
  async getStaffUsers(): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
    const ownerSnapshot = await adminDB
      .collection("users")
      .where("role", "==", "owner")
      .get();

    const employeeSnapshot = await adminDB
      .collection("users")
      .where("role", "==", "employee")
      .get();

    return [...ownerSnapshot.docs, ...employeeSnapshot.docs];
  }
}
