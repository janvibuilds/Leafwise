import { connection } from "next/server";
import type { Metadata } from "next";
import Greeting from "@/components/app/Greeting";
import PageHeader from "@/components/app/PageHeader";
import Dashboard from "@/components/dashboard/Dashboard";
import { serverApi } from "@/lib/api-server";

export const metadata: Metadata = { title: "Overview · Leafwise" };
export const instant = false;

export default async function DashboardPage() {
  await connection();

  let rows: Awaited<ReturnType<typeof serverApi.listPredictions>> = [];
  let errorMessage: string | null = null;
  try {
    rows = await serverApi.listPredictions({ limit: 100 });
  } catch {
    errorMessage = "Your scan summary could not be loaded. Please try again.";
  }

  return (
    <>
      <PageHeader title={<Greeting />} />
      <Dashboard rows={rows} error={errorMessage} />
    </>
  );
}
