"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./cardapio.module.scss";

const CATEGORIAS = ["Entrada", "Prato", "Bebida", "Sobremesa"];

export default function CardapioPage() {
  const router = useRouter();
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  // Estado do formulário de criação/edição
  const [idEditando, setIdEditando] = useState(null);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [categoria, setCategoria] = useState("Prato");
  const [ativo, setAtivo] = useState(true);

  const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  async function carregarCardapio() {
    try {
      setCarregando(true);
      const res = await fetch("/api/menu");

      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 403) {
        setMensagemErro("Acesso restrito ao gerente do restaurante.");
        return;
      }

      if (!res.ok) {
        throw new Error("Erro ao carregar o cardápio");
      }

      const dados = await res.json();
      setItens(dados);
    } catch (err) {
      setMensagemErro(err.message || "Erro de conexão ao carregar itens.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarCardapio();
  }, []);

  function iniciarEdicao(item) {
    setIdEditando(item._id);
    setNome(item.nome);
    setPreco(item.preco.toString());
    setCategoria(item.categoria);
    setAtivo(item.ativo);
    setMensagemErro("");
    setMensagemSucesso("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicao() {
    setIdEditando(null);
    setNome("");
    setPreco("");
    setCategoria("Prato");
    setAtivo(true);
    setMensagemErro("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMensagemErro("");
    setMensagemSucesso("");
    setSalvando(true);

    const precoNum = parseFloat(preco.replace(",", "."));
    if (isNaN(precoNum) || precoNum < 0) {
      setMensagemErro("Preço inválido. Digite um valor numérico válido.");
      setSalvando(false);
      return;
    }

    const payload = {
      nome: nome.trim(),
      preco: precoNum,
      categoria,
      ativo,
    };

    try {
      const url = idEditando ? `/api/menu/${idEditando}` : "/api/menu";
      const method = idEditando ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensagemErro(data.error || "Não foi possível salvar o item.");
        setSalvando(false);
        return;
      }

      setMensagemSucesso(
        idEditando
          ? "Item atualizado com sucesso!"
          : "Novo prato adicionado ao cardápio com sucesso!"
      );
      cancelarEdicao();
      await carregarCardapio();
    } catch (err) {
      setMensagemErro("Falha de conexão com o servidor.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleDesativar(item) {
    if (
      !confirm(`Tem certeza que deseja desativar "${item.nome}" do cardápio?`)
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/menu/${item._id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setMensagemErro(data.error || "Erro ao desativar item.");
        return;
      }

      setMensagemSucesso(`"${item.nome}" foi desativado com sucesso.`);
      if (idEditando === item._id) {
        cancelarEdicao();
      }
      await carregarCardapio();
    } catch {
      setMensagemErro("Falha ao se comunicar com o servidor.");
    }
  }

  return (
    <div className={`container ${styles.pageContainer}`}>
      <div className={styles.pageHeader}>
        <h1>Cardápio do Bistrô</h1>
        <p>Gerencie as receitas, entradas, pratos principais e bebidas servidas no bistrô</p>
      </div>

      {mensagemSucesso && (
        <div className="alert alert--success">{mensagemSucesso}</div>
      )}
      {mensagemErro && (
        <div className="alert alert--error">{mensagemErro}</div>
      )}

      <div className={styles.layoutGrid}>
        {/* Formulário de Criação / Edição */}
        <section className={styles.formCard} aria-labelledby="form-title">
          <h2 id="form-title">
            {idEditando ? "Editar Item" : "Novo Item"}
          </h2>
          <p>
            {idEditando
              ? "Modifique os dados do item selecionado"
              : "Preencha as informações do novo item do cardápio"}
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="nome">Nome do Prato / Item</label>
              <input
                id="nome"
                type="text"
                required
                placeholder="ex: Filé Mignon ao Molho Dijon"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={salvando}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="categoria">Categoria</label>
              <select
                id="categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                disabled={salvando}
              >
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="preco">Preço (R$)</label>
              <input
                id="preco"
                type="text"
                required
                placeholder="ex: 48,50"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                disabled={salvando}
              />
            </div>

            {idEditando && (
              <div className={styles.checkboxField}>
                <input
                  id="ativo"
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  disabled={salvando}
                />
                <label htmlFor="ativo">Item ativo para novos pedidos</label>
              </div>
            )}

            <div className={styles.formActions}>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : idEditando
                  ? "Salvar Alterações"
                  : "Adicionar Item"}
              </button>

              {idEditando && (
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={cancelarEdicao}
                  disabled={salvando}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Tabela de Itens Ativos */}
        <section className={styles.listCard} aria-labelledby="list-title">
          <div className={styles.listHeader}>
            <h2 id="list-title">Itens Ativos no Cardápio</h2>
            <span className={styles.counter}>{itens.length} itens disponíveis</span>
          </div>

          <div className={styles.tableWrapper}>
            {carregando ? (
              <div className={styles.emptyState}>
                <p>Carregando itens do cardápio...</p>
              </div>
            ) : itens.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Nenhum item ativo no momento. Adicione novos pratos no formulário ao lado.</p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Categoria</th>
                    <th>Preço Unitário</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.nome}</strong>
                      </td>
                      <td>
                        <span className={styles.categoryBadge}>
                          {item.categoria}
                        </span>
                      </td>
                      <td className={styles.price}>
                        {formatadorMoeda.format(item.preco)}
                      </td>
                      <td>
                        <div className={styles.tableActions}>
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => iniciarEdicao(item)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn--danger btn--sm"
                            onClick={() => handleDesativar(item)}
                          >
                            Desativar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
