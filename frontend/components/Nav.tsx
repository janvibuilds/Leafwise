import Link from "next/link";

const links = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "38 Classes", href: "#classes" },
  { label: "Tech & Model", href: "#diagnostics" },
  { label: "Responsible Use", href: "#live-preview" },
];

/**
 * "Main navigation" (Figma 1:34) — inset 116px, top 40px, height 64.
 * On narrow screens the three groups wrap onto their own lines
 * (no mobile design exists in Figma; all links stay reachable).
 */
export default function Nav() {
  return (
    <nav
      aria-label="Main"
      className="relative z-20 flex flex-wrap items-center justify-between gap-x-11 gap-y-4 px-6 py-6 xl:absolute xl:top-10 xl:right-[116px] xl:left-[116px] xl:h-16 xl:px-0 xl:py-0"
    >
      <a
        href="#top"
        className="font-display text-[28px] leading-[37.4px] text-paper transition-opacity duration-200 hover:opacity-80 xl:text-[34px]"
      >
        ❧ leafwise
      </a>

      <ul className="order-3 flex w-full list-none flex-wrap justify-center gap-x-[38px] gap-y-2 p-0 xl:order-none xl:w-auto xl:justify-start">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="text-[16px] leading-6 text-paper transition-opacity duration-200 hover:opacity-80"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-4 xl:gap-4">
        <Link
          href="/login"
          className="text-[16px] leading-6 text-paper transition-opacity duration-200 hover:opacity-80"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="flex h-[52px] w-[134px] items-center justify-center rounded-[30px] bg-paper text-[16px] leading-5 font-medium text-ink transition-colors duration-200 hover:bg-white"
        >
          Sign up&nbsp;&nbsp;↗
        </Link>
      </div>
    </nav>
  );
}
