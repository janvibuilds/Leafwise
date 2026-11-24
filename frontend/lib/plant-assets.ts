/** Shared real imagery for the 14 supported crops. Images come from the
 * Leafwise Figma design file and are served from /public/images. */

export type CropCategory = "Fruit" | "Vegetable" | "Field crop";

type CropAsset = { image: string; category: CropCategory };

const CROPS: Record<string, CropAsset> = {
  Apple: { image: "/images/apple-crop-image.webp", category: "Fruit" },
  Blueberry: { image: "/images/blueberry-crop-image.webp", category: "Fruit" },
  "Cherry (including sour)": {
    image: "/images/cherry-crop-image.webp",
    category: "Fruit",
  },
  "Corn (maize)": { image: "/images/corn-crop-image.webp", category: "Field crop" },
  Grape: { image: "/images/grape-crop-image.webp", category: "Fruit" },
  Orange: { image: "/images/orange-crop-image.webp", category: "Fruit" },
  Peach: { image: "/images/peach-crop-image.webp", category: "Fruit" },
  "Pepper, bell": {
    image: "/images/bell-pepper-crop-image.webp",
    category: "Vegetable",
  },
  Potato: { image: "/images/potato-crop-image.webp", category: "Vegetable" },
  Raspberry: { image: "/images/raspberry-crop-image.webp", category: "Fruit" },
  Soybean: { image: "/images/soybean-crop-image.webp", category: "Field crop" },
  Squash: { image: "/images/squash-crop-image.webp", category: "Vegetable" },
  Strawberry: { image: "/images/strawberry-crop-image.webp", category: "Fruit" },
  Tomato: { image: "/images/tomato-crop-image.webp", category: "Vegetable" },
};

const DEFAULT_IMAGE = "/images/leafwise-leaf.svg";

export function cropAsset(plant: string): CropAsset {
  return (
    CROPS[plant] ?? {
      image: DEFAULT_IMAGE,
      category: "Field crop",
    }
  );
}

export function cropCategories(): CropCategory[] {
  return ["Fruit", "Vegetable", "Field crop"];
}
