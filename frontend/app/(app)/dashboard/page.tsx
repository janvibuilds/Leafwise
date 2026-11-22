import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { LuArrowRight } from "react-icons/lu";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard · Leafwise" };
export const instant = false;

const cards = [
  {
    href: "/predict",
    title: "Scan a leaf",
    body: "Upload a photo and see the top three matches with confidence states.",
    action: "Start a scan",
  },
  {
    href: "/history",
    title: "Your history",
    body: "Revisit earlier predictions and their private, short-lived image links.",
    action: "View history",
  },
  {
    href: "/profile",
    title: "Your profile",
    body: "Review your account details and how your data is handled.",
    action: "Open profile",
  },
];

export default async function DashboardPage() {
  await connection();
  const user = await requireUser("/dashboard");
  const firstName = user.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div>
      <p className="text-[13px] tracking-[0.16em] text-ink/45 uppercase">
        Workspace
      </p>
      <h1 className="mt-3 font-display text-[clamp(32px,4vw,52px)] leading-[1.1]">
        Hello, {firstName}
      </h1>
      <p className="mt-4 max-w-[620px] text-[16px] leading-7 text-ink/70">
        Your leaf-health workspace is ready. Predictions are AI-assisted
        estimates for the 38 supported classes, not a substitute for a qualified
        agricultural professional.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex flex-col rounded-3xl border border-ink/10 bg-paper p-6 transition hover:-translate-y-0.5 hover:border-teal/60 hover:shadow-[0_18px_40px_-24px_rgba(6,26,43,0.35)]"
          >
            <h2 className="font-display text-[24px]">{card.title}</h2>
            <p className="mt-3 flex-1 text-[14px] leading-6 text-ink/65">
              {card.body}
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-teal group-hover:underline">
              {card.action}
              <LuArrowRight aria-hidden="true" size={15} />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-3xl bg-night px-7 py-8 text-paper">
        <h2 className="font-display text-[26px]">Responsible use</h2>
        <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-paper/70">
          Field photos, lighting, and background can reduce accuracy compared
          with the controlled dataset this model was trained on. Always confirm
          important treatment or financial decisions with an expert.
        </p>
      </div>
    </div>
  );
}
