import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import MenuItem from "../models/MenuItem.js";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("ERRO: MONGODB_URI não encontrada nas variáveis de ambiente (.env.local)");
  process.exit(1);
}

async function seed() {
  try {
    console.log("Conectando ao MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Conectado com sucesso!");

    // 1. Limpeza das coleções de usuários e cardápio
    console.log("Limpando usuários e itens de cardápio antigos...");
    await User.deleteMany({});
    await MenuItem.deleteMany({});

    // 2. Criação dos Usuários com senha hasheada com bcryptjs
    const senhaPadrao = "123456";
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senhaPadrao, saltRounds);

    const usuarios = [
      {
        nome: "Gerente Carlos",
        email: "gerente@bistro.com",
        senhaHash: senhaHash,
        role: "gerente",
      },
      {
        nome: "Garçom João",
        email: "garcom@bistro.com",
        senhaHash: senhaHash,
        role: "garcom",
      },
    ];

    const usuariosCriados = await User.insertMany(usuarios);
    console.log(`✓ ${usuariosCriados.length} usuários criados com sucesso:`);
    usuariosCriados.forEach((u) => console.log(`   - [${u.role}] ${u.nome} (${u.email})`));

    // 3. Criação de 9 itens de cardápio de exemplo
    const itensCardapio = [
      // Entradas
      {
        nome: "Bruschetta Tradicional de Tomate e Manjericão",
        preco: 28.5,
        categoria: "Entrada",
        ativo: true,
      },
      {
        nome: "Salada Caprese com Pesto Artesanal",
        preco: 34.0,
        categoria: "Entrada",
        ativo: true,
      },
      // Pratos
      {
        nome: "Risoto de Cogumelos Paris e Alho-poró",
        preco: 68.0,
        categoria: "Prato",
        ativo: true,
      },
      {
        nome: "Filé Mignon ao Molho Mostarda Dijon",
        preco: 86.0,
        categoria: "Prato",
        ativo: true,
      },
      {
        nome: "Salmão Grelhado com Legumes Salteados",
        preco: 78.0,
        categoria: "Prato",
        ativo: true,
      },
      // Bebidas
      {
        nome: "Suco Natural de Laranja 400ml",
        preco: 12.0,
        categoria: "Bebida",
        ativo: true,
      },
      {
        nome: "Taça de Vinho Tinto Reserva da Casa",
        preco: 26.0,
        categoria: "Bebida",
        ativo: true,
      },
      // Sobremesas
      {
        nome: "Petit Gâteau com Sorvete de Baunilha",
        preco: 29.0,
        categoria: "Sobremesa",
        ativo: true,
      },
      {
        nome: "Tiramisù Clássico Italiano",
        preco: 27.5,
        categoria: "Sobremesa",
        ativo: true,
      },
    ];

    const itensCriados = await MenuItem.insertMany(itensCardapio);
    console.log(`✓ ${itensCriados.length} itens do cardápio inseridos com sucesso.`);

    console.log("\n==========================================");
    console.log("SEED CONCLUÍDO COM SUCESSO!");
    console.log("Credenciais para teste (senha: 123456):");
    console.log("  Gerente: gerente@bistro.com");
    console.log("  Garçom:  garcom@bistro.com");
    console.log("==========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  }
}

seed();
