import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={user.name} userEmail={user.email} />
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
