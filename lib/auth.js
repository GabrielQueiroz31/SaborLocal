import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Função guard para proteção de rotas de API.
 * Lê o token do cookie "token" ou do cabeçalho "Authorization: Bearer <token>".
 * Valida o JWT no servidor e confere as permissões de role.
 *
 * @param {Request} req - Requisição HTTP recebida
 * @param {string|string[]} [roles] - Papéis permitidos (ex: "gerente" ou ["gerente", "garcom"])
 * @returns {Promise<{ user: { id: string, role: string, nome: string } } | { error: NextResponse }>}
 */
export async function guard(req, roles) {
  try {
    let token = null;

    // 1. Tenta obter o token dos cookies
    if (req.cookies && typeof req.cookies.get === "function") {
      token = req.cookies.get("token")?.value;
    } else {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    // 2. Se não achou no cookie, tenta no cabeçalho Authorization Bearer
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }

    // Se ainda não houver token, retorna 401 Não autenticado
    if (!token) {
      return {
        error: NextResponse.json(
          { error: "Não autenticado: token não fornecido" },
          { status: 401 }
        ),
      };
    }

    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET não está configurado nas variáveis de ambiente");
    }

    // 3. Valida e decodifica o JWT no servidor
    const decoded = jwt.verify(token, JWT_SECRET);

    // 4. Validação de papéis (roles), se especificados
    if (roles) {
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      if (!allowedRoles.includes(decoded.role)) {
        return {
          error: NextResponse.json(
            { error: "Acesso negado: permissão insuficiente" },
            { status: 403 }
          ),
        };
      }
    }

    return { user: decoded };
  } catch (err) {
    return {
      error: NextResponse.json(
        { error: "Não autenticado: token inválido ou expirado" },
        { status: 401 }
      ),
    };
  }
}
