import type { ReactNode } from "react";

// The real root layout (with <html lang>) is app/[locale]/layout.tsx.
// app/not-found.tsx renders its own document for URLs outside /{locale}/.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
