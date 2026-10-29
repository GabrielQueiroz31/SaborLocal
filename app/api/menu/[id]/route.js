import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import MenuItem from "@/models/MenuItem";
import { guard } from "@/lib/auth";

/**
 * PUT /api/menu/[id]
 * Permissão: somente gerente
 * Atualiza um item do cardápio com validações do Mongoose.
 */
export async function PUT(req, { params }) {
  try {
    const auth = await guard(req, "gerente");
    if (auth.error) return auth.error;

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Identificador de item inválido" },
        { status: 400 }
      );
    }

    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Corpo da requisição inválido" },
        { status: 400 }
      );
    }

    const updates = {};
    if (body.nome !== undefined) updates.nome = String(body.nome).trim();
    if (body.categoria !== undefined) updates.categoria = body.categoria;
    if (body.ativo !== undefined) updates.ativo = Boolean(body.ativo);

    if (body.preco !== undefined) {
      const precoNum = Number(body.preco);
      if (isNaN(precoNum) || precoNum < 0) {
        return NextResponse.json(
          { error: "O preço deve ser um número maior ou igual a zero" },
          { status: 400 }
        );
      }
      updates.preco = precoNum;
    }

    const itemAtualizado = await MenuItem.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!itemAtualizado) {
      return NextResponse.json(
        { error: "Item do cardápio não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(itemAtualizado, { status: 200 });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return NextResponse.json(
        { error: messages.join(", ") },
        { status: 400 }
      );
    }

    console.error("Erro ao atualizar item do cardápio:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar item do cardápio" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/menu/[id]
 * Permissão: somente gerente
 * Executa soft delete (marca ativo = false).
 */
export async function DELETE(req, { params }) {
  try {
    const auth = await guard(req, "gerente");
    if (auth.error) return auth.error;

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Identificador de item inválido" },
        { status: 400 }
      );
    }

    await connectDB();

    const item = await MenuItem.findByIdAndUpdate(
      id,
      { ativo: false },
      { new: true }
    );

    if (!item) {
      return NextResponse.json(
        { error: "Item do cardápio não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Item desativado com sucesso", item },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao desativar item do cardápio:", error);
    return NextResponse.json(
      { error: "Erro interno ao desativar item do cardápio" },
      { status: 500 }
    );
  }
}
