import { redirect } from "next/navigation";

export default function Home() {
  // Redirect users to the login page when they visit the root URL
  redirect("/login");
}
