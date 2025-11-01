import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PrimeReactProvider } from "primereact/api";
import { ThemeProvider } from "@components/theme-provider";
import "primereact/resources/themes/bootstrap4-dark-blue/theme.css";
import { UserProvider } from "./context/UserContext";
import Footer from "./components/footer";
import Menu from "./components/Menu";
import "primeicons/primeicons.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Itinerary App",
  description: "Plan and manage your travel itineraries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} flex flex-col min-h-screen antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PrimeReactProvider>
            <UserProvider>
              <Menu />
              <main className="flex-grow">{children}</main>
              <Footer />
            </UserProvider>
          </PrimeReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
