import type { Metadata } from "next";
import { Kino } from "@/components/Kino";
import { getVerbs } from "@/lib/cards";

export const metadata: Metadata = { title: "Diashow" };

export default async function KinoPage({ searchParams }: PageProps<"/kino">) {
  const { ids } = await searchParams;
  const all = getVerbs();
  const wanted = typeof ids === "string" && ids ? ids.split(",").map((s) => decodeURIComponent(s).normalize("NFC")) : null;
  const verbs = wanted ? wanted.map((id) => all.find((v) => v.id === id)).filter((v) => !!v) : all;
  return <Kino verbs={verbs} />;
}
