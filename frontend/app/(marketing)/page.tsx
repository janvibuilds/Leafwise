import Hero from "@/components/Hero";
import DiagnosticsSection from "@/components/DiagnosticsSection";
import FieldSection from "@/components/FieldSection";
import ClassesSection from "@/components/ClassesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import LivePreviewSection from "@/components/LivePreviewSection";
import UseCasesSection from "@/components/UseCasesSection";
import QuickScanSection from "@/components/QuickScanSection";

/**
 * Leafwise landing page — sections assembled in Figma frame 1:31 order.
 * All styling/dimensions live in the section components; this file is
 * intentionally just the composition root.
 */
export default function Page() {
  return (
    <main>
      <Hero />
      <DiagnosticsSection />
      <FieldSection />
      <ClassesSection />
      <HowItWorksSection />
      <LivePreviewSection />
      <UseCasesSection />
      <QuickScanSection />
    </main>
  );
}
