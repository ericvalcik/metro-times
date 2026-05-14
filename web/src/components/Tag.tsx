import { cn } from "@/lib/utils";
import { FC } from "react";

type MetroTagProps = {
  type: `metro${"A" | "B" | "C"}`;
  className?: string;
};

export const typeToColor: Record<MetroTagProps["type"], string> = {
  metroA: "#50AF32",
  metroB: "#FFD500",
  metroC: "#E63024",
};

const typeToName: Record<MetroTagProps["type"], string> = {
  metroA: "Metro A",
  metroB: "Metro B",
  metroC: "Metro C",
};

export const MetroTag: FC<MetroTagProps> = ({ type, className }) => {
  const name = typeToName[type];
  const color = typeToColor[type];

  return (
    <div
      style={{ color, borderColor: color }}
      className={cn(
        "px-2 border-2 border-solid rounded-full flex gap-1 items-center mr-auto",
        className,
      )}
    >
      <div
        style={{ backgroundColor: color }}
        className="w-[7px] h-[7px] rounded-full"
      ></div>
      <div className="font-bold text-sm">{name}</div>
    </div>
  );
};
