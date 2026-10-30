import "./globals.css";
import TripProvider from "@/components/TripProvider";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "VARKALA TRIP '26 🌊",
  description: "Cliff & surf trip companion — split bills, settle via UPI, tick off Varkala spots. Aditya, Divyanshu, Bibek, Ritu, Vidhi, Dibyashree & Kritika.",
  applicationName: "Varkala Trip '26",
  appleWebApp: { capable: true, title: "Varkala '26", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFD600",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <TripProvider>
          <div className="app-container">{children}</div>
          <Navbar />
        </TripProvider>
      </body>
    </html>
  );
}
