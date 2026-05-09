import Image from "next/image";
import { getBrandLogo } from "@/lib/brandLogos";

type Props = {
  brand: string;
  size?: number;
  className?: string;
};

export default function BrandLogo({ brand, size = 20, className }: Props) {
  return (
    <Image
      src={getBrandLogo(brand)}
      alt={brand}
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  );
}
