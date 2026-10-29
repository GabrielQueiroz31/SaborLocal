import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body || !body.email || !body.senha) {
      return NextResponse.json(
        { error: "Email ou senha inválidos" },
        { status: 401 }
      );
    }

    const { email, senha } = body;

    // Busca usuário pelo email normalizado
    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) {
      return NextResponse.json(
        { error: "Email ou senha inválidos" },
        { status: 401 }
      );
    }

    // Compara senha com o hash do banco
    const senhaValida = await bcrypt.compare(senha, user.senhaHash);
    if (!senhaValida) {
      return NextResponse.json(
        { error: "Email ou senha inválidos" },
        { status: 401 }
      );
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET não está definido");
    }

    // Gera o token JWT com payload { id, role, nome } e duração de 8 horas
    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
        nome: user.nome,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    // Retorna { nome, role } para o front e grava o cookie httpOnly "token"
    const response = NextResponse.json(
      {
        nome: user.nome,
        role: user.role,
      },
      { status: 200 }
    );

    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60, // 8 horas em segundos
    });

    return response;
  } catch (error) {
    console.error("Erro na rota POST /api/auth/login:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar o login" },
      { status: 500 }
    );
  }
}
