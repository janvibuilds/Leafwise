import { LuArrowRight, LuImageUp } from "react-icons/lu";

type UploadPillProps = {
  /** Unique id — pairs the hidden file input with its labels. */
  id: string;
  className?: string;
};

/**
 * Leaf-upload control: a soft drop-zone prompt with a clear primary action.
 * Both labels open the same hidden file input, so it works without JS.
 * Stacks on small screens and becomes a single pill from `sm` upward.
 */
export default function UploadPill({ id, className = "" }: UploadPillProps) {
  return (
    <div
      className={`group flex w-full max-w-[504px] flex-col gap-2 rounded-[26px] border border-ink/10 bg-paper/95 p-2 shadow-[0_18px_50px_-24px_rgba(6,26,43,0.5)] backdrop-blur-sm transition-shadow duration-300 hover:shadow-[0_22px_60px_-24px_rgba(6,26,43,0.6)] sm:flex-row sm:items-center sm:gap-1 sm:rounded-full ${className}`}
    >
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="peer sr-only"
      />

      <label
        htmlFor={id}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-[20px] px-4 py-3 outline-none transition-colors hover:bg-bone/70 focus-visible:ring-2 focus-visible:ring-teal/60 peer-focus-visible:ring-2 peer-focus-visible:ring-teal/60 sm:py-2"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal/15 text-teal">
          <LuImageUp aria-hidden="true" size={22} />
        </span>
        <span className="min-w-0">
          <span className="block text-[16px] leading-6 font-medium whitespace-nowrap text-ink sm:text-[17px]">
            Drop a leaf photo
          </span>
          <span className="block text-[12px] leading-4 text-ink/55">
            or browse · JPG, PNG or WEBP · up to 5 MB
          </span>
        </span>
      </label>

      <label
        htmlFor={id}
        className="flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] leading-5 font-medium whitespace-nowrap text-paper outline-none transition-all duration-200 hover:-translate-y-0.5 hover:bg-night focus-visible:ring-2 focus-visible:ring-teal/60 focus-visible:ring-offset-2 peer-focus-visible:ring-2 peer-focus-visible:ring-teal/60 active:translate-y-0"
      >
        Analyze leaf
        <LuArrowRight aria-hidden="true" size={18} />
      </label>
    </div>
  );
}
