import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import "@/models/User";
import { guard } from "@/lib/auth";

/**
 * POST /api/mesas/[mesa]/fechar
 * Permissão: gerente, garcom
 * Busca pedidos da mesa com pago = false.
 * - Se não houver nenhum pedido em aberto: retorna 404.
 * - Se algum pedido não estiver com status "Entregue": retorna 400 com mensagem clara.
 * - Se todos estiverem "Entregue": soma os totais, marca pago = true com updateMany
 *   e retorna { mesa, total, pedidos }.
 */
export async function POST(req, { params }) {
  try {
    const auth = await guard(req, ["gerente", "garcom"]);
    if (auth.error) return auth.error;

    const { mesa } = await params;
    const mesaNum = parseInt(mesa, 10);

    if (isNaN(mesaNum) || mesaNum < 1) {
      return NextResponse.json(
        { error: "Número da mesa inválido" },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Busca todos os pedidos não pagos da mesa
    const pedidosAbertos = await Order.find({ mesa: mesaNum, pago: false })
      .sort({ createdAt: 1 })
      .populate("criadoPor", "nome role");

    if (pedidosAbertos.length === 0) {
      return NextResponse.json(
        { error: `Não existem pedidos em aberto para a Mesa ${mesaNum}` },
        { status: 404 }
      );
    }

    // 2. Verifica se algum pedido ainda não foi entregue
    const pedidosPendentes = pedidosAbertos.filter(
      (p) => p.status !== "Entregue"
    );

    if (pedidosPendentes.length > 0) {
      return NextResponse.json(
        {
          error: `Não é possível fechar a conta da Mesa ${mesaNum}: existem ${pedidosPendentes.length} pedido(s) que ainda não foram entregues pela cozinha.`,
        },
        { status: 400 }
      );
    }

    // 3. Soma os totais dos pedidos entregues
    const totalConta = pedidosAbertos.reduce((acc, p) => acc + p.total, 0);

    // 4. Marca todos como pago = true de forma atômica
    await Order.updateMany(
      { mesa: mesaNum, pago: false },
      { $set: { pago: true } }
    );

    return NextResponse.json(
      {
        mesa: mesaNum,
        total: totalConta,
        pedidos: pedidosAbertos,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao fechar conta da mesa:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao fechar a conta da mesa" },
      { status: 500 }
    );
  }
}
