import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { removeDownload } from "@/lib/verfahren-downloads";

export async function POST(request: Request) {
  await requireAdminSession();

  const form = await request.formData();
  const id = form.get("id");
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  await removeDownload(id);

  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
