import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

export const metadata = {
  title: "Clínica Veterinaria Patitas",
  description: "Gestión de turnos y historias clínicas",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={plusJakarta.variable}>
      <body className="min-h-screen antialiased font-sans">{children}</body>
    </html>
  );
}
