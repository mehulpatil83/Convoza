import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PrefsProvider } from "@/components/Prefs";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Convoza: from chat to clarity",
  description: "Convoza turns messy WhatsApp chats into clean, structured orders with Gemma 4. Bills, a community feed, and who owes what.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Set the saved theme before first paint so there is no flash.
const themeScript = `try{var t=localStorage.getItem('convoza.theme');if(t==='classic'||t==='vintage'||t==='mono')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="classic" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <PrefsProvider>
          <Header />
          <main id="top">{children}</main>
        </PrefsProvider>
      </body>
    </html>
  );
}
