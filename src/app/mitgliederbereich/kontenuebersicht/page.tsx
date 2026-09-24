import type { Metadata } from "next";
import MitgliederPlatzhalter from "@/components/MitgliederPlatzhalter";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Kontenübersicht | VTG Nordrhein-Westfalen" };

export default async function KontenuebersichtPage() {
  await requireSession();
  return <MitgliederPlatzhalter title="Kontenübersicht" />;
}
