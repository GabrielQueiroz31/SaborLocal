import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import { guard } from "@/lib/auth";

/**
 * GET /api/reports/revenue
 * Permissão: somente gerente
 * Retorna o faturamento agregado dos pedidos pagos (pago = true) agrupados por dia,
 * utilizando $dateToString com o timezone "America/Sao_Paulo" sobre o campo updatedAt.
 * Ordenado do dia mais recente para o mais antigo.
 */
export async function GET(req) {
  try {
    const auth = await guard(req, "gerente");
    if (auth.error) return auth.error;

    await connectDB();

    const faturamentoPorDia = await Order.aggregate([
      {
        $match: {
          pago: true,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$updatedAt",
              timezone: "America/Sao_Paulo",
            },
          },
          total: { $sum: "$total" },
          quantidade: { $sum: 1 },
        },
      },
      {
        $sort: {
          _id: -1, // Do mais recente para o mais antigo
        },
      },
      {
        $project: {
          _id: 0,
          data: "$_id",
          total: 1,
          quantidade: 1,
        },
      },
    ]);

    return NextResponse.json(faturamentoPorDia, { status: 200 });
  } catch (error) {
    console.error("Erro ao gerar relatório de faturamento:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao calcular o faturamento" },
      { status: 500 }
    );
  }
}
