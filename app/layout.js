import "./globals.scss";
import Navbar from "@/components/Navbar/Navbar";

export const metadata = {
  title: "Pequeno Bistrô Sabor Local - Gestão de Pedidos",
  description: "Sistema de gestão de pedidos e faturamento do Pequeno Bistrô Sabor Local",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
