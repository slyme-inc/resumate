import { requireResume } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function Home() {
  await requireResume();
  redirect("/jobs");
}
