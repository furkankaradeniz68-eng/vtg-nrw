import type { Metadata } from "next";
import MitgliederPlatzhalter from "@/components/MitgliederPlatzhalter";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Kontoauszüge | VTG Nordrhein-Westfalen" };

export default async function KontoauszuegePage() {
  await requireSession();
  return <MitgliederPlatzhalter title="Kontoauszüge" />;
}
