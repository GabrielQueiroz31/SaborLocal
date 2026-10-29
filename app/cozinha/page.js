"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./cozinha.module.scss";

export default function CozinhaPage() {
  const router = useRouter();
  const [pedidosRecebidos, setPedidosRecebidos] = useState([]);
  const [pedidosEmPreparo, setPedidosEmPreparo] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizandoStatusId, setAtualizandoStatusId] = useState(null);
  const [mensagemErro, setMensagemErro] = useState("");
  const [agora, setAgora] = useState(null);

  // Atualiza o relógio no cliente a cada 30s para atualizar o cálculo de tempo decorrido
  useEffect(() => {
    setAgora(Date.now());
    const timer = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const carregarPedidos = useCallback(async () => {
    try {
      // A cozinha consome pedidos por status (assim o garçom também vê todos os pedidos da cozinha)
      const [resRecebidos, resPreparo] = await Promise.all([
        fetch("/api/orders?status=Recebido"),
        fetch("/api/orders?status=Em Preparo"),
      ]);

      if (resRecebidos.status === 401 || resPreparo.status === 401) {
        router.push("/login");
        return;
      }

      if (!resRecebidos.ok || !resPreparo.ok) {
        throw new Error("Erro ao carregar comandas da cozinha");
      }

      const dadosRecebidos = await resRecebidos.json();
      const dadosPreparo = await resPreparo.json();

      setPedidosRecebidos(dadosRecebidos);
      setPedidosEmPreparo(dadosPreparo);
    } catch (err) {
      setMensagemErro(err.message || "Erro na comunicação com o servidor");
    } finally {
      setCarregando(false);
    }
  }, [router]);

  // Polling automático a cada 5 segundos com limpeza no unmount
  useEffect(() => {
    carregarPedidos();
    const interval = setInterval(() => {
      carregarPedidos();
    }, 5000);

    return () => clearInterval(interval);
  }, [carregarPedidos]);

  async function handleMudarStatus(pedidoId, novoStatus) {
    try {
      setAtualizandoStatusId(pedidoId);
      setMensagemErro("");

      const res = await fetch(`/api/orders/${pedidoId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensagemErro(data.error || "Não foi possível avançar o pedido");
        return;
      }

      // Atualiza a visualização imediatamente
      await carregarPedidos();
    } catch (err) {
      setMensagemErro("Erro de rede ao atualizar o status do pedido");
    } finally {
      setAtualizandoStatusId(null);
    }
  }

  function formatarTempoDecorrido(dataCriacao) {
    const timestampAtual = agora || Date.now();
    const diffMs = timestampAtual - new Date(dataCriacao).getTime();
    const minutos = Math.floor(diffMs / (1000 * 60));

    if (minutos < 1) return { texto: "agora mesmo", urgente: false };
    if (minutos < 60) {
      return {
        texto: `há ${minutos} min`,
        urgente: minutos >= 15,
      };
    }

    const horas = Math.floor(minutos / 60);
    const minRestantes = minutos % 60;
    return {
      texto: `há ${horas}h ${minRestantes}m`,
      urgente: true,
    };
  }

  return (
    <div className={`container ${styles.pageContainer}`}>
      <div className={styles.headerRow}>
        <div>
          <h1>Painel da Cozinha (KDS)</h1>
          <p>Acompanhamento em tempo real da ordem de chegada e preparo dos pratos</p>
        </div>

        <div className={styles.liveIndicator}>
          <span className={styles.pulseDot} />
          <span>Atualizando ao vivo (5s)</span>
        </div>
      </div>

      {mensagemErro && (
        <div className="alert alert--error">{mensagemErro}</div>
      )}

      <div className={styles.kanbanBoard}>
        {/* Coluna 1: RECEBIDO (Aguardando Preparo) */}
        <section
          className={`${styles.column} ${styles["column--recebido"]}`}
          aria-labelledby="col-recebidos"
        >
          <div className={styles.columnHeader}>
            <h2 id="col-recebidos">
              <span>🔔</span> Pedidos Recebidos
            </h2>
            <span className={`${styles.badgeCount} ${styles.recebido}`}>
              {pedidosRecebidos.length}
            </span>
          </div>

          <div className={styles.orderList}>
            {carregando && pedidosRecebidos.length === 0 ? (
              <div className={styles.emptyColumn}>Carregando comandas...</div>
            ) : pedidosRecebidos.length === 0 ? (
              <div className={styles.emptyColumn}>
                Nenhum pedido aguardando no momento.
              </div>
            ) : (
              pedidosRecebidos.map((pedido) => {
                const tempo = formatarTempoDecorrido(pedido.createdAt);
                const isProcessando = atualizandoStatusId === pedido._id;

                return (
                  <article key={pedido._id} className={styles.ticketCard}>
                    <div className={styles.ticketHeader}>
                      <span className={styles.mesaTag}>
                        Mesa {pedido.mesa}
                      </span>
                      <span
                        className={`${styles.timeTag} ${
                          tempo.urgente ? styles.urgent : ""
                        }`}
                      >
                        ⏱ {tempo.texto}
                      </span>
                    </div>

                    <div className={styles.ticketMeta}>
                      Anotado por: {pedido.criadoPor?.nome || "Garçom"} • ID: #
                      {pedido._id.slice(-4)}
                    </div>

                    <ul className={styles.ticketItems}>
                      {pedido.itens.map((item, idx) => (
                        <li key={idx} className={styles.ticketItem}>
                          <div className={styles.itemMain}>
                            <span className={styles.itemQty}>
                              {item.quantidade}x
                            </span>
                            <span className={styles.itemName}>
                              {item.nome}
                            </span>
                          </div>
                          {item.observacao && (
                            <span className={styles.itemObs}>
                              Observação: {item.observacao}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>

                    <div className={styles.ticketFooter}>
                      <button
                        type="button"
                        className={`btn btn--accent ${styles.actionBtn}`}
                        onClick={() =>
                          handleMudarStatus(pedido._id, "Em Preparo")
                        }
                        disabled={isProcessando}
                      >
                        {isProcessando
                          ? "Atualizando..."
                          : "Iniciar Preparo 🍳"}
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* Coluna 2: EM PREPARO */}
        <section
          className={`${styles.column} ${styles["column--preparo"]}`}
          aria-labelledby="col-preparo"
        >
          <div className={styles.columnHeader}>
            <h2 id="col-preparo">
              <span>🔥</span> Em Preparo
            </h2>
            <span className={`${styles.badgeCount} ${styles.preparo}`}>
              {pedidosEmPreparo.length}
            </span>
          </div>

          <div className={styles.orderList}>
            {carregando && pedidosEmPreparo.length === 0 ? (
              <div className={styles.emptyColumn}>Carregando comandas...</div>
            ) : pedidosEmPreparo.length === 0 ? (
              <div className={styles.emptyColumn}>
                Nenhum prato no fogo ou na chapa agora.
              </div>
            ) : (
              pedidosEmPreparo.map((pedido) => {
                const tempo = formatarTempoDecorrido(pedido.createdAt);
                const isProcessando = atualizandoStatusId === pedido._id;

                return (
                  <article key={pedido._id} className={styles.ticketCard}>
                    <div className={styles.ticketHeader}>
                      <span className={styles.mesaTag}>
                        Mesa {pedido.mesa}
                      </span>
                      <span
                        className={`${styles.timeTag} ${
                          tempo.urgente ? styles.urgent : ""
                        }`}
                      >
                        ⏱ {tempo.texto}
                      </span>
                    </div>

                    <div className={styles.ticketMeta}>
                      Anotado por: {pedido.criadoPor?.nome || "Garçom"} • ID: #
                      {pedido._id.slice(-4)}
                    </div>

                    <ul className={styles.ticketItems}>
                      {pedido.itens.map((item, idx) => (
                        <li key={idx} className={styles.ticketItem}>
                          <div className={styles.itemMain}>
                            <span className={styles.itemQty}>
                              {item.quantidade}x
                            </span>
                            <span className={styles.itemName}>
                              {item.nome}
                            </span>
                          </div>
                          {item.observacao && (
                            <span className={styles.itemObs}>
                              Observação: {item.observacao}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>

                    <div className={styles.ticketFooter}>
                      <button
                        type="button"
                        className={`btn btn--primary ${styles.actionBtn}`}
                        onClick={() =>
                          handleMudarStatus(pedido._id, "Entregue")
                        }
                        disabled={isProcessando}
                      >
                        {isProcessando
                          ? "Atualizando..."
                          : "Prato Pronto / Entregue 🛎️"}
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
