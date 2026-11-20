import Nav from "@/components/Nav";
import SiteFooter from "@/components/SiteFooter";

/** Public marketing shell: shared navigation and footer for all marketing pages. */
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Nav />
      {children}
      <SiteFooter />
    </>
  );
}
