import type { Metadata } from "next";
import { AdminStudio } from "@/components/admin/AdminStudio";

export const metadata: Metadata = {
  title: "Studio",
  description: "Private content and analytics studio for SOMANADH.OS.",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <AdminStudio />;
}
