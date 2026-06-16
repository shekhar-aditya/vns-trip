import "./globals.css";

export const metadata = {
  title: "Varanasi Trip Manager 🚂",
  description: "Track and split expenses for our Varanasi trip — Aditya, Aman, Varun, Ananya & Ritu",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#06060f" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚂</text></svg>" />
      </head>
      <body>
        <div className="bg-gradient-orb bg-gradient-orb--purple" />
        <div className="bg-gradient-orb bg-gradient-orb--pink" />
        {children}
      </body>
    </html>
  );
}
