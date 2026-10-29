"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./faturamento.module.scss";

/**
 * Formata strings de data YYYY-MM-DD para o padrão amigável pt-BR
 * evitando problemas de fuso horário UTC na renderização.
 * Exemplo de retorno: "Qui., 29/10/2026"
 */
function formatarDataBR(dataStr) {
  if (!dataStr) return "-";
  const partes = dataStr.split("-");
  if (partes.length !== 3) return dataStr;
  const [ano, mes, dia] = partes;
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  const formatada = data.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  // Capitaliza a primeira letra do dia da semana (ex: qui. -> Qui.)
  return formatada.charAt(0).toUpperCase() + formatada.slice(1);
}

export default function FaturamentoPage() {
  const router = useRouter();
  const [relatorios, setRelatorios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const formatadorMoeda = useMemo(
    () =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    []
  );

  const carregarFaturamento = useCallback(async () => {
    try {
      setCarregando(true);
      setErro("");

      const res = await fetch("/api/reports/revenue");

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (res.status === 403) {
        setErro("Acesso restrito: apenas gerentes podem visualizar o faturamento.");
        setCarregando(false);
        return;
      }

      if (!res.ok) {
        const dadosErro = await res.json().catch(() => ({}));
        throw new Error(dadosErro.error || "Erro ao consultar dados de faturamento");
      }

      const dados = await res.json();
      setRelatorios(Array.isArray(dados) ? dados : []);
    } catch (err) {
      console.error("Falha ao carregar faturamento:", err);
      setErro(err.message || "Não foi possível carregar os dados de faturamento.");
    } finally {
      setCarregando(false);
    }
  }, [router]);

  useEffect(() => {
    carregarFaturamento();
  }, [carregarFaturamento]);

  // Cálculo de KPIs
  const kpis = useMemo(() => {
    const totalGeral = relatorios.reduce((acc, item) => acc + (item.total || 0), 0);
    const totalPedidos = relatorios.reduce((acc, item) => acc + (item.quantidade || 0), 0);
    const numeroDias = relatorios.length;
    const mediaDiaria = numeroDias > 0 ? totalGeral / numeroDias : 0;

    return {
      totalGeral,
      totalPedidos,
      numeroDias,
      mediaDiaria,
    };
  }, [relatorios]);

  return (
    <div className={`container ${styles.pageContainer}`}>
      <div className={styles.pageHeader}>
        <h1>Relatório de Faturamento</h1>
        <p>
          Acompanhe o desempenho financeiro consolidado, média diária e volume de pedidos pagos do bistrô
        </p>
      </div>

      {erro && (
        <div className="alert alert--error" role="alert">
          {erro}
        </div>
      )}

      {/* Grid de KPIs */}
      <section className={styles.kpiGrid} aria-label="Indicadores Chave de Desempenho">
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>💰</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total Geral Faturado</span>
            <span className={`${styles.kpiValue} ${styles.highlight}`}>
              {carregando ? "..." : formatadorMoeda.format(kpis.totalGeral)}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>📅</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Dias com Vendas</span>
            <span className={styles.kpiValue}>
              {carregando ? "..." : `${kpis.numeroDias} ${kpis.numeroDias === 1 ? "dia" : "dias"}`}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>📊</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Média Diária</span>
            <span className={styles.kpiValue}>
              {carregando ? "..." : formatadorMoeda.format(kpis.mediaDiaria)}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>🧾</div>
          <div className={styles.kpiContent}>
            <span className={styles.kpiLabel}>Total de Pedidos Pagos</span>
            <span className={styles.kpiValue}>
              {carregando ? "..." : `${kpis.totalPedidos} ${kpis.totalPedidos === 1 ? "pedido" : "pedidos"}`}
            </span>
          </div>
        </div>
      </section>

      {/* Card da Tabela de Faturamento Diário */}
      <section className={styles.reportCard} aria-label="Faturamento por Dia">
        <div className={styles.reportHeader}>
          <h2>Detalhamento Diário</h2>
          <span className={styles.timezoneNote}>
            Fuso: Horário de Brasília (America/Sao_Paulo)
          </span>
        </div>

        <div className={styles.tableWrapper}>
          {carregando ? (
            <div className={styles.emptyState}>
              <p>Carregando dados de faturamento...</p>
            </div>
          ) : relatorios.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Nenhum pedido pago foi registrado até o momento.</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Quantidade de Pedidos</th>
                  <th scope="col">Total Faturado</th>
                </tr>
              </thead>
              <tbody>
                {relatorios.map((item) => (
                  <tr key={item.data}>
                    <td>
                      <span className={styles.dateCell}>
                        <span>📅</span>
                        <span>{formatarDataBR(item.data)}</span>
                      </span>
                    </td>
                    <td>
                      <span className={styles.qtyBadge}>
                        {item.quantidade} {item.quantidade === 1 ? "pedido" : "pedidos"}
                      </span>
                    </td>
                    <td>
                      <span className={styles.revenueValue}>
                        {formatadorMoeda.format(item.total)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
