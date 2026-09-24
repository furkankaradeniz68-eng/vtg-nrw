import type { Metadata } from "next";
import MitgliederPlatzhalter from "@/components/MitgliederPlatzhalter";
import { requireInternSession } from "@/lib/auth";

export const metadata: Metadata = { title: "TG-Einzeldaten | VTG Nordrhein-Westfalen" };

export default async function TgEinzeldatenPage() {
  await requireInternSession();
  return <MitgliederPlatzhalter title="TG-Einzeldaten" />;
}
