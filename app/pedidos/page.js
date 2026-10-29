"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./pedidos.module.scss";

export default function PedidosPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  // Estado para fechar conta
  const [mesaParaFechar, setMesaParaFechar] = useState(null);
  const [fechandoConta, setFechandoConta] = useState(false);
  const [reciboModal, setReciboModal] = useState(null); // { mesa, total, pedidos }

  const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const carregarDados = useCallback(async () => {
    try {
      const [resUser, resPedidos] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/orders"),
      ]);

      if (resUser.status === 401 || resPedidos.status === 401) {
        router.push("/login");
        return;
      }

      if (resUser.ok) setUsuario(await resUser.json());
      if (resPedidos.ok) setPedidos(await resPedidos.json());
    } catch (err) {
      setMensagemErro("Erro ao sincronizar pedidos com o servidor.");
    } finally {
      setCarregando(false);
    }
  }, [router]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Agrupamento de pedidos não pagos por mesa para o fechamento
  const mesasAbertas = useMemo(() => {
    const mapa = {};
    for (const p of pedidos) {
      if (p.pago) continue;
      if (!mapa[p.mesa]) {
        mapa[p.mesa] = {
          mesa: p.mesa,
          pedidos: [],
          total: 0,
          todosEntregues: true,
          pendentes: 0,
        };
      }
      mapa[p.mesa].pedidos.push(p);
      mapa[p.mesa].total += p.total;
      if (p.status !== "Entregue") {
        mapa[p.mesa].todosEntregues = false;
        mapa[p.mesa].pendentes += 1;
      }
    }
    return Object.values(mapa).sort((a, b) => a.mesa - b.mesa);
  }, [pedidos]);

  // Filtragem dos pedidos na lista principal
  const pedidosFiltrados = useMemo(() => {
    if (filtroStatus === "Todos") return pedidos;
    if (filtroStatus === "Pagos") return pedidos.filter((p) => p.pago);
    if (filtroStatus === "Abertos") return pedidos.filter((p) => !p.pago);
    return pedidos.filter((p) => p.status === filtroStatus && !p.pago);
  }, [pedidos, filtroStatus]);

  async function handleMarcarEntregue(pedidoId) {
    try {
      setMensagemErro("");
      const res = await fetch(`/api/orders/${pedidoId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Entregue" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMensagemErro(data.error || "Não foi possível marcar como entregue");
        return;
      }

      setMensagemSucesso("Pedido marcado como Entregue!");
      await carregarDados();
    } catch {
      setMensagemErro("Erro de rede ao marcar como entregue.");
    }
  }

  async function confirmarFecharConta() {
    if (!mesaParaFechar) return;
    setFechandoConta(true);
    setMensagemErro("");

    try {
      const res = await fetch(`/api/mesas/${mesaParaFechar.mesa}/fechar`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setMensagemErro(data.error || "Erro ao fechar conta da mesa.");
        setMesaParaFechar(null);
        return;
      }

      setReciboModal(data);
      setMesaParaFechar(null);
      setMensagemSucesso(`✓ Conta da Mesa ${data.mesa} fechada com sucesso!`);
      await carregarDados();
    } catch {
      setMensagemErro("Erro ao processar fechamento de conta.");
    } finally {
      setFechandoConta(false);
    }
  }

  return (
    <div className={`container ${styles.pageContainer}`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>
            {usuario?.role === "gerente"
              ? "Todos os Pedidos"
              : "Meus Pedidos Anotados"}
          </h1>
          <p>
            {usuario?.role === "gerente"
              ? "Visão geral das comandas, status das mesas e controle de fechamento de conta"
              : "Acompanhe as entregas das mesas atendidas por você"}
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/pedidos/novo" className="btn btn--primary">
            + Novo Pedido
          </Link>
        </div>
      </div>

      {mensagemSucesso && (
        <div className="alert alert--success">{mensagemSucesso}</div>
      )}
      {mensagemErro && (
        <div className="alert alert--error">{mensagemErro}</div>
      )}

      {/* Seção de Mesas em Aberto com Ação Rápida de Fechamento */}
      {mesasAbertas.length > 0 && (
        <section
          className={styles.mesasSection}
          aria-labelledby="mesas-abertas-title"
        >
          <h2 id="mesas-abertas-title" className={styles.mesasTitle}>
            <span>💳</span> Mesas com Contas em Aberto ({mesasAbertas.length})
          </h2>

          <div className={styles.mesasGrid}>
            {mesasAbertas.map((m) => (
              <div key={m.mesa} className={styles.mesaSummaryCard}>
                <div className={styles.mesaCardTop}>
                  <span className={styles.mesaNum}>Mesa {m.mesa}</span>
                  <span className={styles.mesaTotal}>
                    {formatadorMoeda.format(m.total)}
                  </span>
                </div>

                <div className={styles.mesaStatusInfo}>
                  {m.pedidos.length} pedido(s) •{" "}
                  {m.todosEntregues ? (
                    <strong style={{ color: "#16a34a" }}>
                      Todos entregues ✓
                    </strong>
                  ) : (
                    <span style={{ color: "#d97706" }}>
                      {m.pendentes} aguardando entrega
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className={`btn ${
                    m.todosEntregues ? "btn--primary" : "btn--secondary"
                  } ${styles.fecharBtn}`}
                  onClick={() => setMesaParaFechar(m)}
                  disabled={!m.todosEntregues}
                  title={
                    !m.todosEntregues
                      ? "Aguarde todos os pedidos da mesa serem entregues para fechar a conta"
                      : "Fechar conta desta mesa"
                  }
                >
                  {m.todosEntregues
                    ? "Fechar Conta 💳"
                    : "Aguardando Cozinha ⏳"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Abas de Filtros de Pedidos */}
      <div className={styles.filterTabs} role="tablist">
        {["Todos", "Abertos", "Recebido", "Em Preparo", "Entregue", "Pagos"].map(
          (aba) => (
            <button
              key={aba}
              type="button"
              role="tab"
              aria-selected={filtroStatus === aba}
              className={`${styles.filterBtn} ${
                filtroStatus === aba ? styles.active : ""
              }`}
              onClick={() => setFiltroStatus(aba)}
            >
              {aba}
            </button>
          )
        )}
      </div>

      {/* Grid de Pedidos */}
      {carregando ? (
        <div className={styles.emptyState}>Carregando pedidos...</div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Nenhum pedido encontrado neste filtro.</p>
        </div>
      ) : (
        <div className={styles.ordersGrid}>
          {pedidosFiltrados.map((pedido) => (
            <article
              key={pedido._id}
              className={`${styles.orderCard} ${
                pedido.pago ? styles.pago : ""
              }`}
            >
              <div>
                <div className={styles.orderHeader}>
                  <span className={styles.orderMesa}>Mesa {pedido.mesa}</span>
                  <span className={styles.orderDate}>
                    {new Date(pedido.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className={styles.statusRow}>
                  <span
                    className={`${styles.statusBadge} ${
                      pedido.status === "Recebido"
                        ? styles.recebido
                        : pedido.status === "Em Preparo"
                        ? styles.preparo
                        : styles.entregue
                    }`}
                  >
                    {pedido.status}
                  </span>

                  {pedido.pago && (
                    <span className={styles.pagoBadge}>✓ CONTA PAGA</span>
                  )}
                </div>

                <div className={styles.orderAuthor}>
                  Atendido por: {pedido.criadoPor?.nome || "Equipe"}
                </div>

                <ul className={styles.itemsList}>
                  {pedido.itens.map((item, idx) => (
                    <li key={idx} className={styles.itemRow}>
                      <div className={styles.itemName}>
                        <span>
                          {item.quantidade}x {item.nome}
                        </span>
                        {item.observacao && (
                          <span className={styles.itemObs}>
                            Obs: {item.observacao}
                          </span>
                        )}
                      </div>
                      <span className={styles.itemPrice}>
                        {formatadorMoeda.format(
                          item.precoUnit * item.quantidade
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.orderFooter}>
                <span className={styles.totalValue}>
                  {formatadorMoeda.format(pedido.total)}
                </span>

                {pedido.status === "Em Preparo" && !pedido.pago && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => handleMarcarEntregue(pedido._id)}
                  >
                    Marcar Entregue 🛎️
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal de Confirmação de Fechamento de Conta */}
      {mesaParaFechar && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-fechar-title"
        >
          <div className={styles.modalCard}>
            <h2 id="modal-fechar-title">
              Fechar Conta - Mesa {mesaParaFechar.mesa}
            </h2>
            <p>
              Confirma o fechamento da conta da Mesa {mesaParaFechar.mesa}?
              Todos os {mesaParaFechar.pedidos.length} pedidos já foram
              entregues e serão marcados como pagos.
            </p>

            <div className={styles.receiptTotal}>
              <span>Valor Total da Mesa:</span>
              <strong>{formatadorMoeda.format(mesaParaFechar.total)}</strong>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setMesaParaFechar(null)}
                disabled={fechandoConta}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={confirmarFecharConta}
                disabled={fechandoConta}
              >
                {fechandoConta ? "Fechando..." : "Confirmar Fechamento 💳"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recibo Concluído */}
      {reciboModal && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="recibo-title"
        >
          <div className={styles.modalCard}>
            <h2 id="recibo-title">✓ Conta Encerrada!</h2>
            <p>
              A Mesa {reciboModal.mesa} teve sua conta fechada com sucesso. Os
              pedidos foram marcados como pagos e computados no faturamento do
              bistrô.
            </p>

            <div className={styles.receiptTotal}>
              <span>Total Pago:</span>
              <strong>{formatadorMoeda.format(reciboModal.total)}</strong>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setReciboModal(null)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
