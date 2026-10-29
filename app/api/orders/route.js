import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Order from "@/models/Order";
import MenuItem from "@/models/MenuItem";
import "@/models/User"; // Registra o model User para o populate
import { guard } from "@/lib/auth";

/**
 * GET /api/orders
 * Permissão: gerente, garcom
 * Parâmetros de busca opcionais: ?status=
 * Regra:
 * - Ordenação: createdAt crescente (mais antigo primeiro).
 * - Se for garçom e NÃO houver filtro de status, retorna apenas os pedidos criados por ele.
 * - Se houver ?status= (ex: cozinha), retorna todos os pedidos com aquele status independente de quem criou.
 * - Gerente tem acesso a todos os pedidos.
 */
export async function GET(req) {
  try {
    const auth = await guard(req, ["gerente", "garcom"]);
    if (auth.error) return auth.error;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");

    const filtro = {};

    if (statusParam) {
      filtro.status = statusParam;
    } else if (auth.user.role === "garcom") {
      // Garçom sem filtro de status só vê os seus próprios pedidos
      filtro.criadoPor = auth.user.id;
    }

    const pedidos = await Order.find(filtro)
      .sort({ createdAt: 1 })
      .populate("criadoPor", "nome email role");

    return NextResponse.json(pedidos, { status: 200 });
  } catch (error) {
    console.error("Erro ao listar pedidos:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar pedidos" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Permissão: gerente, garcom
 * Recebe: { mesa, itens: [{ menuItemId, quantidade, observacao }] }
 * Regras cruciais:
 * - O preço NUNCA vem do front-end.
 * - Busca os MenuItem ativos no banco e monta o snapshot (nome e precoUnit) no servidor.
 * - Valida mesa >= 1, itens não vazio e quantidade >= 1.
 * - Salva com criadoPor = user.id.
 * - Retorna 201 Created.
 */
export async function POST(req) {
  try {
    const auth = await guard(req, ["gerente", "garcom"]);
    if (auth.error) return auth.error;

    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Corpo da requisição inválido" },
        { status: 400 }
      );
    }

    const { mesa, itens } = body;

    // 1. Validação da Mesa
    const mesaNum = parseInt(mesa, 10);
    if (isNaN(mesaNum) || mesaNum < 1) {
      return NextResponse.json(
        { error: "O número da mesa deve ser um valor numérico maior ou igual a 1" },
        { status: 400 }
      );
    }

    // 2. Validação da Lista de Itens
    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json(
        { error: "O pedido deve conter pelo menos 1 item do cardápio" },
        { status: 400 }
      );
    }

    // 3. Validação individual dos IDs e quantidades
    for (const item of itens) {
      if (!item.menuItemId || !mongoose.Types.ObjectId.isValid(item.menuItemId)) {
        return NextResponse.json(
          { error: "Identificador de item do cardápio inválido" },
          { status: 400 }
        );
      }

      const qtd = parseInt(item.quantidade, 10);
      if (isNaN(qtd) || qtd < 1) {
        return NextResponse.json(
          { error: "A quantidade de cada item deve ser no mínimo 1" },
          { status: 400 }
        );
      }
    }

    // 4. Busca os itens ativos no banco para montar o SNAPSHOT seguro no servidor
    const itemIds = itens.map((i) => i.menuItemId);
    const itensBanco = await MenuItem.find({
      _id: { $in: itemIds },
      ativo: true,
    });

    const mapaBanco = new Map(itensBanco.map((m) => [m._id.toString(), m]));

    // 5. Montagem dos subdocumentos com preço do servidor (ignora qualquer preço vindo do cliente)
    const snapshotItens = [];
    for (const item of itens) {
      const menuItemDoBanco = mapaBanco.get(item.menuItemId.toString());

      if (!menuItemDoBanco) {
        return NextResponse.json(
          {
            error: `O item com ID ${item.menuItemId} não existe ou está inativo no cardápio`,
          },
          { status: 400 }
        );
      }

      snapshotItens.push({
        menuItem: menuItemDoBanco._id,
        nome: menuItemDoBanco.nome,
        precoUnit: menuItemDoBanco.preco,
        quantidade: parseInt(item.quantidade, 10),
        observacao: item.observacao ? String(item.observacao).trim() : "",
      });
    }

    // 6. Criação do Pedido
    const novoPedido = new Order({
      mesa: mesaNum,
      itens: snapshotItens,
      criadoPor: auth.user.id,
      status: "Recebido",
      pago: false,
    });

    await novoPedido.save();

    // Popula o criadoPor para o retorno
    await novoPedido.populate("criadoPor", "nome email role");

    return NextResponse.json(novoPedido, { status: 201 });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return NextResponse.json(
        { error: messages.join(", ") },
        { status: 400 }
      );
    }

    console.error("Erro ao criar pedido:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar o pedido" },
      { status: 500 }
    );
  }
}
