import "./globals.css";

export const metadata = {
  title: "Armeria 200",
  description: "Gestionale Armeria 200",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
