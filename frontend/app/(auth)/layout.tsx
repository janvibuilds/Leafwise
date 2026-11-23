import Link from "next/link";
import Brand from "@/components/Brand";

/**
 * Auth shell. Sign-in, sign-up and password recovery share this split layout
 * on the main domain; the app subdomain redirects auth pages back here.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="grid min-h-screen bg-paper lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-night px-12 py-14 text-paper lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -bottom-48 h-[560px] w-[560px] rounded-full bg-teal/20 blur-3xl"
        />
        <LinkBrand />
        <div className="relative max-w-[440px]">
          <p className="font-display text-[clamp(32px,3.4vw,54px)] leading-[1.12]">
            A little clarity. A healthier harvest.
          </p>
          <p className="mt-6 text-[16px] leading-7 text-paper/70">
            Upload a leaf photo, see the top three matches, and keep a private
            history of every observation.
          </p>
        </div>
        <p className="relative text-[13px] text-paper/50">
          AI-assisted estimates only. Confirm important decisions with an
          agricultural professional.
        </p>
      </aside>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        {children}
      </section>
    </main>
  );
}

function LinkBrand() {
  return (
    <Link
      href="/"
      className="relative w-fit font-display text-[32px] leading-none text-paper transition-opacity hover:opacity-80"
    >
      <Brand />
    </Link>
  );
}
