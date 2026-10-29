import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import "@/models/User";
import { guard } from "@/lib/auth";

/**
 * PATCH /api/orders/[id]/status
 * Permissão: gerente, garcom
 * Recebe: { status }
 * Regra: Só permitir transições estritas:
 *   "Recebido" -> "Em Preparo"
 *   "Em Preparo" -> "Entregue"
 * Qualquer outra transição deve retornar 400 com mensagem clara.
 * Utiliza order.save() para disparar os hooks de Mongoose.
 */
export async function PATCH(req, { params }) {
  try {
    const auth = await guard(req, ["gerente", "garcom"]);
    if (auth.error) return auth.error;

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Identificador de pedido inválido" },
        { status: 400 }
      );
    }

    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body || !body.status) {
      return NextResponse.json(
        { error: "O novo status do pedido é obrigatório" },
        { status: 400 }
      );
    }

    const { status: novoStatus } = body;

    const pedido = await Order.findById(id);
    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    const statusAtual = pedido.status;

    // Validação estrita da máquina de estados do pedido
    const transicaoValida =
      (statusAtual === "Recebido" && novoStatus === "Em Preparo") ||
      (statusAtual === "Em Preparo" && novoStatus === "Entregue");

    if (!transicaoValida) {
      return NextResponse.json(
        {
          error: `Transição de status inválida: não é permitido alterar de '${statusAtual}' para '${novoStatus}'. Apenas as transições 'Recebido' -> 'Em Preparo' e 'Em Preparo' -> 'Entregue' são permitidas.`,
        },
        { status: 400 }
      );
    }

    // Aplica o novo status e salva via order.save() para disparar hooks
    pedido.status = novoStatus;
    await pedido.save();

    await pedido.populate("criadoPor", "nome email role");

    return NextResponse.json(pedido, { status: 200 });
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao atualizar status do pedido" },
      { status: 500 }
    );
  }
}
