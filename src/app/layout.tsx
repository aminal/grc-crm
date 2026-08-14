import type { Metadata } from "next";
import { Jost } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

const themeScript = `
(() => {
  try {
    const storedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const darkMode = storedTheme === "dark" || (storedTheme !== "light" && prefersDark);
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
  } catch {
  }
})();
`;

export const metadata: Metadata = {
  title: "Green Room GRC",
  description: "CRM, METRC inventory, and sales lifecycle management for Green Room Cannabis.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">): React.ReactElement {
  return (
    <html lang="en" className={`${jost.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-zinc-100 font-sans text-zinc-950 dark:bg-zinc-950 dark:text-white">
        <Script id="theme-preference" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
