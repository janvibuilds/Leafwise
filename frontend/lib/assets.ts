// Central asset registry — static imports so Next.js fingerprints and
// optimizes every image. All artwork comes from `frontend/images/`
// (supplied WebP photos + SVGs exported from the Figma design).

// Background photos (Figma image fills, matched by imageRef)
import heroBg from "@/images/Agricultural_drone_scanning_farm…_c1d8d0be_2K 1.webp";
import classesBg from "@/images/Farm_banner_illustration_cf9f5a3e_2K 1.webp";
import soilBg from "@/images/Underground_soil_bed_vector_illu…_c9c796c9_2K 1.webp";
import twilightBg from "@/images/Wind_turbines_on_agricultural_la…_25ac0cb1_2K 1.webp";
import quickScanBg from "@/images/Farm_banner_illustration_design_7897d729_2K 1.webp";
import footerBg from "@/images/Underground_soil_bed_vector_illu…_544f39bf_2K 1.webp";

// Vector illustrations exported from Figma nodes as SVG.
// Next 16 emits an object for static SVG imports; plain <img> needs the
// fingerprinted URL string, so unwrap `.src` here.
import handScannerImport from "@/images/asset-hand-scanner.svg";
import leafTomatoImport from "@/images/asset-leaf-tomato.svg";
import cropTomatoImport from "@/images/asset-crop-tomato.svg";
import cropAppleImport from "@/images/asset-crop-apple.svg";
import cropCornImport from "@/images/asset-crop-corn.svg";
import cropPotatoImport from "@/images/asset-crop-potato.svg";
import cropGrapeImport from "@/images/asset-crop-grape.svg";
import cropPepperImport from "@/images/asset-crop-pepper.svg";

const svgUrl = (mod: { src?: string } | string): string =>
  typeof mod === "string" ? mod : (mod.src as string);

export {
  heroBg,
  classesBg,
  soilBg,
  twilightBg,
  quickScanBg,
  footerBg,
};

export const handScanner = svgUrl(handScannerImport);
export const leafTomato = svgUrl(leafTomatoImport);
export const cropTomato = svgUrl(cropTomatoImport);
export const cropApple = svgUrl(cropAppleImport);
export const cropCorn = svgUrl(cropCornImport);
export const cropPotato = svgUrl(cropPotatoImport);
export const cropGrape = svgUrl(cropGrapeImport);
export const cropPepper = svgUrl(cropPepperImport);
