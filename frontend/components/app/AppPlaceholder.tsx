type AppPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

/** Shared shell for not-yet-implemented app sections. */
export default function AppPlaceholder({
  eyebrow,
  title,
  description,
}: AppPlaceholderProps) {
  return (
    <div>
      <p className="text-[13px] tracking-[0.16em] text-ink/45 uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-display text-[clamp(32px,4vw,52px)] leading-[1.1]">
        {title}
      </h1>
      <p className="mt-4 max-w-[620px] text-[16px] leading-7 text-ink/70">
        {description}
      </p>
      <div className="mt-10 rounded-3xl border border-dashed border-ink/20 bg-paper px-7 py-12 text-center">
        <p className="text-[15px] font-medium">Coming next</p>
        <p className="mt-2 text-[14px] text-ink/60">
          This screen will be wired to the FastAPI backend in the next milestone.
        </p>
      </div>
    </div>
  );
}
