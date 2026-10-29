import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import MenuItem from "@/models/MenuItem";
import { guard } from "@/lib/auth";

/**
 * GET /api/menu
 * Permissão: gerente, garcom
 * Lista todos os itens ativos do cardápio, ordenados por categoria e nome.
 */
export async function GET(req) {
  try {
    const auth = await guard(req, ["gerente", "garcom"]);
    if (auth.error) return auth.error;

    await connectDB();

    const itens = await MenuItem.find({ ativo: true }).sort({
      categoria: 1,
      nome: 1,
    });

    return NextResponse.json(itens, { status: 200 });
  } catch (error) {
    console.error("Erro ao listar cardápio:", error);
    return NextResponse.json(
      { error: "Erro ao buscar os itens do cardápio" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/menu
 * Permissão: somente gerente
 * Cadastra um novo item no cardápio.
 */
export async function POST(req) {
  try {
    const auth = await guard(req, "gerente");
    if (auth.error) return auth.error;

    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Dados inválidos ou corpo da requisição vazio" },
        { status: 400 }
      );
    }

    const { nome, preco, categoria, ativo } = body;

    if (!nome || typeof nome !== "string" || !nome.trim()) {
      return NextResponse.json(
        { error: "O nome do item é obrigatório" },
        { status: 400 }
      );
    }

    const precoNum = Number(preco);
    if (isNaN(precoNum) || precoNum < 0) {
      return NextResponse.json(
        { error: "O preço deve ser um número maior ou igual a zero" },
        { status: 400 }
      );
    }

    const categoriasValidas = ["Entrada", "Prato", "Bebida", "Sobremesa"];
    if (!categoriasValidas.includes(categoria)) {
      return NextResponse.json(
        {
          error:
            "Categoria inválida. Categorias permitidas: Entrada, Prato, Bebida, Sobremesa",
        },
        { status: 400 }
      );
    }

    const novoItem = await MenuItem.create({
      nome: nome.trim(),
      preco: precoNum,
      categoria,
      ativo: ativo !== undefined ? Boolean(ativo) : true,
    });

    return NextResponse.json(novoItem, { status: 201 });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return NextResponse.json(
        { error: messages.join(", ") },
        { status: 400 }
      );
    }

    console.error("Erro ao criar item do cardápio:", error);
    return NextResponse.json(
      { error: "Erro interno ao cadastrar item no cardápio" },
      { status: 500 }
    );
  }
}
