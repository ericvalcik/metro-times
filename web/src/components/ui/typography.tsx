import { FC, ReactNode } from "react";

export const TypographyH1: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl pb-6">
      {children}
    </h1>
  );
};

export const TypographyH3: FC<{ children: ReactNode }> = ({ children }) => {
  return <h3 className="text-base font-semibold">{children}</h3>;
};
