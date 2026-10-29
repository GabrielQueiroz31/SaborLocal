"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import styles from "./novo.module.scss";

const CATEGORIAS = ["Todas", "Entrada", "Prato", "Bebida", "Sobremesa"];
const MESAS_RAPIDAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function NovoPedidoPage() {
  const router = useRouter();
  const [cardapio, setCardapio] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todas");

  // Estado do pedido
  const [mesa, setMesa] = useState("");
  const [itensPedido, setItensPedido] = useState({}); // { [itemId]: { menuItemId, nome, precoUnit, quantidade, observacao } }

  const [enviando, setEnviando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // Carrega cardápio ativo
  useEffect(() => {
    async function carregarCardapio() {
      try {
        setCarregando(true);
        const res = await fetch("/api/menu");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) throw new Error("Erro ao carregar cardápio");

        const dados = await res.json();
        setCardapio(dados);
      } catch (err) {
        setMensagemErro(err.message || "Não foi possível carregar os itens.");
      } finally {
        setCarregando(false);
      }
    }

    carregarCardapio();
  }, [router]);

  // Manipulação de quantidades dos itens
  function incrementarItem(item) {
    setItensPedido((prev) => {
      const atual = prev[item._id] || {
        menuItemId: item._id,
        nome: item.nome,
        precoUnit: item.preco,
        quantidade: 0,
        observacao: "",
      };

      return {
        ...prev,
        [item._id]: {
          ...atual,
          quantidade: atual.quantidade + 1,
        },
      };
    });
  }

  function decrementarItem(item) {
    setItensPedido((prev) => {
      const atual = prev[item._id];
      if (!atual) return prev;

      if (atual.quantidade <= 1) {
        const novo = { ...prev };
        delete novo[item._id];
        return novo;
      }

      return {
        ...prev,
        [item._id]: {
          ...atual,
          quantidade: atual.quantidade - 1,
        },
      };
    });
  }

  function atualizarObservacao(itemId, obs) {
    setItensPedido((prev) => {
      if (!prev[itemId]) return prev;
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          observacao: obs,
        },
      };
    });
  }

  function removerItem(itemId) {
    setItensPedido((prev) => {
      const novo = { ...prev };
      delete novo[itemId];
      return novo;
    });
  }

  // Lista de itens selecionados e cálculos
  const listaItensSelecionados = useMemo(
    () => Object.values(itensPedido),
    [itensPedido]
  );

  const totalEstimado = useMemo(() => {
    return listaItensSelecionados.reduce((acc, item) => {
      return acc + item.precoUnit * item.quantidade;
    }, 0);
  }, [listaItensSelecionados]);

  const totalQuantidade = useMemo(() => {
    return listaItensSelecionados.reduce((acc, item) => acc + item.quantidade, 0);
  }, [listaItensSelecionados]);

  // Agrupamento do cardápio por categoria
  const cardapioFiltrado = useMemo(() => {
    if (categoriaAtiva === "Todas") return cardapio;
    return cardapio.filter((item) => item.categoria === categoriaAtiva);
  }, [cardapio, categoriaAtiva]);

  const cardapioPorCategoria = useMemo(() => {
    const mapa = {};
    for (const item of cardapioFiltrado) {
      if (!mapa[item.categoria]) mapa[item.categoria] = [];
      mapa[item.categoria].push(item);
    }
    return mapa;
  }, [cardapioFiltrado]);

  async function handleEnviarPedido() {
    setMensagemErro("");
    setMensagemSucesso("");

    const mesaNum = parseInt(mesa, 10);
    if (isNaN(mesaNum) || mesaNum < 1) {
      setMensagemErro("Por favor, selecione ou digite o número da mesa (mínimo 1).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (listaItensSelecionados.length === 0) {
      setMensagemErro("Adicione ao menos um item ao pedido antes de enviar.");
      return;
    }

    setEnviando(true);

    try {
      const payload = {
        mesa: mesaNum,
        itens: listaItensSelecionados.map((item) => ({
          menuItemId: item.menuItemId,
          quantidade: item.quantidade,
          observacao: item.observacao,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensagemErro(data.error || "Erro ao registrar o pedido.");
        setEnviando(false);
        return;
      }

      setMensagemSucesso(
        `✓ Pedido da Mesa ${mesaNum} enviado para a cozinha com sucesso!`
      );
      // Limpa os dados do pedido atual
      setItensPedido({});
      setMesa("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setMensagemErro("Falha de conexão ao enviar o pedido para a cozinha.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={`container ${styles.pageContainer}`}>
      <div className={styles.pageHeader}>
        <h1>Novo Pedido</h1>
        <p>Selecione a mesa e adicione os pratos do cardápio</p>
      </div>

      {mensagemSucesso && (
        <div className="alert alert--success">
          <p>{mensagemSucesso}</p>
          <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
            <button
              onClick={() => router.push("/pedidos")}
              className="btn btn--secondary btn--sm"
            >
              Ver Meus Pedidos
            </button>
            <button
              onClick={() => setMensagemSucesso("")}
              className="btn btn--primary btn--sm"
            >
              Anotar Outro Pedido
            </button>
          </div>
        </div>
      )}

      {mensagemErro && (
        <div className="alert alert--error">{mensagemErro}</div>
      )}

      {/* Caixa de Seleção da Mesa */}
      <section className={styles.mesaBox} aria-labelledby="mesa-label">
        <label id="mesa-label" htmlFor="mesa-input">
          Número da Mesa:
        </label>
        <div className={styles.mesaInputWrapper}>
          <input
            id="mesa-input"
            type="number"
            min="1"
            placeholder="Nº"
            value={mesa}
            onChange={(e) => setMesa(e.target.value)}
          />
        </div>

        <div className={styles.quickMesaBtns}>
          {MESAS_RAPIDAS.map((num) => (
            <button
              key={num}
              type="button"
              className={parseInt(mesa, 10) === num ? styles.selected : ""}
              onClick={() => setMesa(num.toString())}
            >
              Mesa {num}
            </button>
          ))}
        </div>
      </section>

      {/* Layout Principal: Cardápio + Resumo */}
      <div className={styles.mainLayout}>
        <div className={styles.menuColumn}>
          {/* Abas de Categorias */}
          <div className={styles.categoryTabs} role="tablist">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={categoriaAtiva === cat}
                className={`${styles.categoryBtn} ${
                  categoriaAtiva === cat ? styles.active : ""
                }`}
                onClick={() => setCategoriaAtiva(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Listagem de Itens Agrupados */}
          {carregando ? (
            <p>Carregando itens do cardápio...</p>
          ) : Object.keys(cardapioPorCategoria).length === 0 ? (
            <p>Nenhum item disponível nesta categoria.</p>
          ) : (
            Object.entries(cardapioPorCategoria).map(([cat, itens]) => (
              <section key={cat} className={styles.menuSection}>
                <h2 className={styles.categoryTitle}>{cat}</h2>
                <div className={styles.itemGrid}>
                  {itens.map((item) => {
                    const qtd = itensPedido[item._id]?.quantidade || 0;
                    const obs = itensPedido[item._id]?.observacao || "";

                    return (
                      <div
                        key={item._id}
                        className={`${styles.menuItemCard} ${
                          qtd > 0 ? styles.hasQuantity : ""
                        }`}
                      >
                        <div className={styles.itemDetails}>
                          <h3 className={styles.itemName}>{item.nome}</h3>
                          <span className={styles.itemPrice}>
                            {formatadorMoeda.format(item.preco)}
                          </span>
                        </div>

                        <div className={styles.counterRow}>
                          <span style={{ fontSize: "0.85rem", color: "#6e645e" }}>
                            {qtd > 0 ? `${qtd} no pedido` : "Não selecionado"}
                          </span>

                          <div className={styles.counterControls}>
                            <button
                              type="button"
                              className={styles.counterBtn}
                              onClick={() => decrementarItem(item)}
                              disabled={qtd === 0}
                              aria-label={`Diminuir ${item.nome}`}
                            >
                              −
                            </button>
                            <span className={styles.quantityDisplay}>
                              {qtd}
                            </span>
                            <button
                              type="button"
                              className={styles.counterBtn}
                              onClick={() => incrementarItem(item)}
                              aria-label={`Adicionar ${item.nome}`}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {qtd > 0 && (
                          <input
                            type="text"
                            className={styles.obsInput}
                            placeholder="Obs: ex: sem pimenta, bem passado..."
                            value={obs}
                            onChange={(e) =>
                              atualizarObservacao(item._id, e.target.value)
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Resumo do Pedido (Desktop) */}
        <aside className={styles.summaryCard} aria-labelledby="resumo-title">
          <h2 id="resumo-title">
            <span>Resumo</span>
            {mesa && <span>Mesa {mesa}</span>}
          </h2>
          <div className={styles.mesaInfo}>
            {mesa ? `Mesa selecionada: ${mesa}` : "Nenhuma mesa definida"}
          </div>

          {listaItensSelecionados.length === 0 ? (
            <div className={styles.emptySummary}>
              <p>Nenhum item adicionado ainda.</p>
              <p style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                Use os botões + e − no cardápio para montar o pedido.
              </p>
            </div>
          ) : (
            <ul className={styles.selectedList}>
              {listaItensSelecionados.map((item) => (
                <li key={item.menuItemId} className={styles.selectedItem}>
                  <div className={styles.itemInfo}>
                    <div className={styles.name}>
                      {item.quantidade}x {item.nome}
                    </div>
                    {item.observacao && (
                      <span className={styles.obs}>
                        Nota: {item.observacao}
                      </span>
                    )}
                  </div>
                  <div className={styles.itemTotal}>
                    {formatadorMoeda.format(item.precoUnit * item.quantidade)}
                  </div>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removerItem(item.menuItemId)}
                    title="Remover item"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className={styles.totalRow}>
            <span>Total Estimado:</span>
            <strong>{formatadorMoeda.format(totalEstimado)}</strong>
          </div>

          <button
            type="button"
            className={`btn btn--primary ${styles.sendBtn}`}
            onClick={handleEnviarPedido}
            disabled={enviando || listaItensSelecionados.length === 0 || !mesa}
          >
            {enviando ? "Enviando..." : "Enviar para Cozinha 👨‍🍳"}
          </button>
        </aside>
      </div>

      {/* Barra Flutuante de Ação Rápida no Mobile/Tablet */}
      <div className={styles.mobileFloatingBar}>
        <div className={styles.mobileTotalInfo}>
          <span className={styles.itemsCount}>
            {totalQuantidade} {totalQuantidade === 1 ? "item" : "itens"}{" "}
            {mesa ? `• Mesa ${mesa}` : ""}
          </span>
          <span className={styles.estimatedTotal}>
            {formatadorMoeda.format(totalEstimado)}
          </span>
        </div>
        <button
          type="button"
          className={`btn btn--primary ${styles.mobileSendBtn}`}
          onClick={handleEnviarPedido}
          disabled={enviando || listaItensSelecionados.length === 0 || !mesa}
        >
          {enviando ? "Enviando..." : "Enviar Cozinha 👨‍🍳"}
        </button>
      </div>
    </div>
  );
}
