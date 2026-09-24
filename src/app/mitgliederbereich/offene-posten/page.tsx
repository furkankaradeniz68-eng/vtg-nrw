import type { Metadata } from "next";
import MitgliederPlatzhalter from "@/components/MitgliederPlatzhalter";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Offene Posten | VTG Nordrhein-Westfalen" };

export default async function OffenePostenPage() {
  await requireSession();
  return <MitgliederPlatzhalter title="Offene Posten" />;
}
