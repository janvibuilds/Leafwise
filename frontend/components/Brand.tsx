import { LuLeaf } from "react-icons/lu";

/** Shared Leafwise wordmark with a consistent leaf icon. Inherits text color. */
export default function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.3em] ${className}`}>
      <LuLeaf aria-hidden="true" size="0.9em" className="shrink-0" />
      <span>leafwise</span>
    </span>
  );
}
