import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";

export const instant = false;

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (token && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === "gerente") {
        redirect("/pedidos");
      } else if (decoded.role === "garcom") {
        redirect("/pedidos/novo");
      }
    } catch {
      // Token inválido ou expirado, prossegue para o login
    }
  }

  redirect("/login");
}
