import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listFonts } from "@/lib/fonts";
import { Fonts } from "./Fonts";

export const metadata: Metadata = { title: "Fonts" };

export default async function FontsPage() {
  const user = await requireUser();
  return <Fonts fonts={await listFonts(user.id)} />;
}
