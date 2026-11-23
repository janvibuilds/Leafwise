import Image from "next/image";
import { LuArrowLeft, LuArrowRight } from "react-icons/lu";
import {
  classesBg,
  cropApple,
  cropCorn,
  cropGrape,
  cropPepper,
  cropPotato,
  cropTomato,
} from "@/lib/assets";

type CropCard = {
  name: string;
  count: string;
  classes: number;
  breakdown: string;
  examples: string;
  image: string;
};

const cards: CropCard[] = [
  {
    name: "Tomato",
    count: "10 classes",
    classes: 10,
    breakdown: "9 disease classes + healthy",
    examples: "Early blight, late blight, leaf mold and more.",
    image: cropTomato,
  },
  {
    name: "Apple",
    count: "04 classes",
    classes: 4,
    breakdown: "3 disease classes + healthy",
    examples: "Scab, black rot and cedar apple rust.",
    image: cropApple,
  },
  {
    name: "Corn / Maize",
    count: "04 classes",
    classes: 4,
    breakdown: "3 disease classes + healthy",
    examples: "Leaf spot, common rust and northern blight.",
    image: cropCorn,
  },
  {
    name: "Potato",
    count: "03 classes",
    classes: 3,
    breakdown: "2 disease classes + healthy",
    examples: "Early blight and late blight.",
    image: cropPotato,
  },
  {
    name: "Grape",
    count: "04 classes",
    classes: 4,
    breakdown: "3 disease classes + healthy",
    examples: "Black rot, black measles and leaf blight.",
    image: cropGrape,
  },
  {
    name: "Pepper",
    count: "02 classes",
    classes: 2,
    breakdown: "1 disease class + healthy",
    examples: "Bacterial spot and healthy bell pepper.",
    image: cropPepper,
  },
];

function CropCardView({ card }: { card: CropCard }) {
  return (
    <article className="flex min-w-0 flex-col gap-[14px] rounded-[22px] bg-bone p-6 xl:gap-[14px] xl:px-7 xl:py-6">
      <div className="flex h-[145px] w-full items-center justify-center">
        <Image
          src={card.image}
          alt={`Illustration of a ${card.name} plant`}
          width={425}
          height={145}
          className="h-[145px] w-full max-w-[425px] object-contain"
        />
      </div>

      <div className="flex items-baseline justify-between gap-5">
        <h3 className="font-display text-[31px] leading-[35.65px] text-ink">
          {card.name}
        </h3>
        <p className="shrink-0 text-[14px] leading-5 text-ink">{card.count}</p>
      </div>
      <p className="text-[15px] leading-[22.5px] text-ink">{card.breakdown}</p>
      <p className="text-[15px] leading-[22.5px] text-ink">{card.examples}</p>
      <p className="text-[11px] leading-[16.5px] whitespace-nowrap text-ink">
        INPUT: 300 × 300 RGB
      </p>

      <div className="h-2 w-full overflow-hidden rounded-[10px] bg-paper">
        <div
          className="h-full rounded-[10px]"
          style={{
            width: `${(card.classes / 38) * 100}%`,
            background: "linear-gradient(90deg, #21bd94 0%, #e8fc47 100%)",
          }}
        />
      </div>
      <p className="text-[11px] leading-[16.5px] text-ink">
        {card.classes} of 38 supported classes
      </p>
    </article>
  );
}

/** "03 · Supported classes" (Figma 1:290) — 1728×1608, pad 100/116. */
export default function ClassesSection() {
  return (
    <section
      id="classes"
      className="relative overflow-hidden bg-paper xl:min-h-[1608px]"
    >
      {/* Background illustration — Figma 1:291 @-235,382 (relative), 2198×1227 */}
      <div className="absolute top-[300px] left-[-235px] h-[1227px] w-[2198px] xl:top-[382px]">
        <Image
          src={classesBg}
          alt=""
          fill
          sizes="100vw"
          aria-hidden="true"
          className="object-cover"
        />
      </div>

      <div className="relative mx-auto w-full max-w-[1728px] px-6 pt-16 pb-16 md:px-10 xl:px-[116px] xl:pt-[100px] xl:pb-0">
        {/* Coverage heading — Figma 1:292 */}
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between xl:gap-[60px]">
          <div className="flex flex-col gap-5">
            <p className="text-[14px] leading-[21px] text-ink">
              03 / SUPPORTED CLASSES
            </p>
            <h2 className="d62 font-display leading-[1.15] text-ink">
              Know what’s in your garden.
            </h2>
            <p className="text-[18px] leading-[1.5] text-ink xl:text-[20px] xl:leading-[30px]">
              38 healthy and disease classes across 14 crop types. Start with a
              familiar leaf.
            </p>
          </div>
          {/* Carousel controls — Figma 1:297 (static: Figma supplies one state) */}
          <div
            className="hidden items-center gap-5 xl:flex"
            aria-label="Crop carousel (decorative in this static preview)"
          >
            <p className="text-[14px] leading-[21px] text-ink">01—06</p>
            <span className="flex items-center gap-4 text-ink" aria-hidden="true">
              <LuArrowLeft size={24} />
              <LuArrowRight size={24} />
            </span>
          </div>
        </div>

        {/* Coverage cards — Figma 1:300 / 1:444, gap 24 + row gap 40 */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:mt-[40px] xl:grid-cols-3 xl:gap-6">
          {cards.map((card) => (
            <CropCardView key={card.name} card={card} />
          ))}
        </div>

        <p className="mt-10 text-[14px] leading-[21px] text-ink xl:mt-[40px]">
          ALSO SUPPORTED&nbsp;&nbsp; Cherry · Peach · Strawberry · Squash ·
          Blueberry · Orange · Raspberry · Soybean
        </p>
        <p className="mt-3 text-[13px] leading-[19.5px] text-ink">
          Coverage describes the model’s class list, not diagnostic accuracy.
          Check limitations before using a result.
        </p>
      </div>
    </section>
  );
}
