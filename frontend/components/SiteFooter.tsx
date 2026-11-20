import Image from "next/image";
import { footerBg } from "@/lib/assets";

const linkColumns = [
  {
    heading: "PLATFORM",
    links: [
      { label: "Scan Leaf", href: "#quick-scan" },
      { label: "38 Classes", href: "#classes" },
      { label: "Roadmap", href: "#how-it-works" },
    ],
  },
  {
    heading: "GUIDANCE",
    links: [
      { label: "Photo Tips", href: "#field" },
      { label: "Limitations", href: "#live-preview" },
      { label: "FAQ", href: "#live-preview" },
    ],
  },
  {
    heading: "STACK",
    links: [
      { label: "Next.js", href: "#top" },
      { label: "FastAPI", href: "#how-it-works" },
      { label: "TensorFlow", href: "#diagnostics" },
      { label: "Supabase", href: "#field" },
    ],
  },
];

/** "08 · Project footer" (Figma 1:797) — 1728×513, soil + wash. */
export default function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-paper xl:min-h-[513px]">
      <div className="absolute inset-x-0 top-[-50px] h-[700px]">
        <Image
          src={footerBg}
          alt=""
          fill
          sizes="100vw"
          aria-hidden="true"
          className="object-cover object-center"
        />
      </div>
      <div className="absolute inset-x-0 top-0 h-[636px] bg-[#0a0503]/40" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-[1728px] px-6 py-14 md:px-10 xl:px-[116px] xl:pt-[70px] xl:pb-0">
        <div className="flex flex-col gap-12 xl:flex-row xl:items-start xl:justify-between xl:gap-[105px]">
          {/* Brand & responsible use — Figma 1:801 */}
          <div className="flex max-w-[450px] flex-col gap-5">
            <a
              href="#top"
              className="w-fit font-display text-[36px] leading-[55.8px] text-paper transition-opacity duration-200 hover:opacity-80"
            >
              ❧ leafwise
            </a>
            <p className="text-[18px] leading-[27.9px] text-paper">
              A little clarity. A healthier harvest.
            </p>
            <p className="text-[15px] leading-[23.25px] text-paper">
              AI-powered plant insights for guidance and learning. Not a
              substitute for a qualified agricultural professional.
            </p>
          </div>

          {/* Link columns — Figma 1:805 */}
          <nav aria-label="Footer" className="flex flex-wrap gap-x-10 gap-y-8 xl:gap-[105px]">
            {linkColumns.map((column) => (
              <div key={column.heading} className="flex flex-col gap-[14px]">
                <h3 className="text-[12px] leading-[18.6px] text-paper">
                  {column.heading}
                </h3>
                <ul className="flex list-none flex-col gap-[14px] p-0">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-[17px] leading-[26.35px] text-paper transition-opacity duration-200 hover:opacity-70"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 h-px w-full bg-paper/25 xl:mt-[50px]" />

        <div className="mt-12 flex flex-col gap-3 pb-2 text-[13px] leading-[20.15px] text-paper xl:mt-[50px] xl:flex-row xl:items-center xl:justify-between xl:gap-[80px] xl:pb-0">
          <p>© 2026 Leafwise · Grow with care.</p>
          <p>Privacy&nbsp;&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;&nbsp;Responsible Use&nbsp;&nbsp;&nbsp;&nbsp;·&nbsp;&nbsp;&nbsp;&nbsp;Built for healthier observations</p>
        </div>
      </div>
    </footer>
  );
}
