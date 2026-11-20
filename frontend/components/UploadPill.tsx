type UploadPillProps = {
  /** Unique id — pairs the hidden file input with its labels. */
  id: string;
  className?: string;
};

/**
 * "Leaf upload pill" (Figma 1:49 / 1:793) — 504×68, radius 48.
 * Both the prompt and the Analyze button open the file picker
 * (labels bound to one hidden input, so it works without JS).
 * Below ~640px the button wraps to its own row instead of overflowing.
 */
export default function UploadPill({ id, className = "" }: UploadPillProps) {
  return (
    <div
      className={`flex w-full max-w-[504px] flex-wrap items-center gap-x-5 gap-y-2 rounded-[48px] bg-paper py-2 pr-2 pl-7 ${className}`}
    >
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only peer"
      />
      <label
        htmlFor={id}
        className="flex min-w-0 cursor-pointer items-center gap-5 outline-offset-4 peer-focus-visible:outline-2 peer-focus-visible:outline-ink"
      >
        <span aria-hidden="true" className="text-[28px] leading-[42px] text-ink">
          ↥
        </span>
        <span className="text-[18px] leading-[27px] whitespace-nowrap text-ink">
          Drop leaf photo or browse
        </span>
      </label>
      <label
        htmlFor={id}
        className="flex h-[52px] w-full cursor-pointer items-center justify-center rounded-[30px] bg-teal text-[16px] leading-5 font-medium whitespace-nowrap text-ink transition-colors duration-200 hover:bg-[#1cae83] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:w-[190px]"
      >
        Analyze leaf&nbsp;&nbsp;→
      </label>
    </div>
  );
}
