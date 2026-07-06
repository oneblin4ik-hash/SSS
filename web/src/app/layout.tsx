import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Про Поток",
  description: "Привлечение подписчиков в Telegram",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
