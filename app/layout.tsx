import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Range — practice prompting like a sport",
  description:
    "Graded prompt-engineering challenges. Write a prompt, fire it at Claude, get scored against a hidden rubric.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-range-bg text-range-text min-h-screen antialiased">{children}</body>
    </html>
  );
}
