"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.scss";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Falha ao realizar login");
        setCarregando(false);
        return;
      }

      // Redirecionamento baseado na role retornada
      if (data.role === "gerente") {
        router.push("/pedidos");
      } else {
        router.push("/pedidos/novo");
      }
      router.refresh();
    } catch (err) {
      setErro("Não foi possível conectar ao servidor. Tente novamente.");
      setCarregando(false);
    }
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <span className={styles.brandBadge}>Pequeno Bistrô</span>
          <h1>Sabor Local</h1>
          <p>Acesse o sistema com suas credenciais de equipe</p>
        </div>

        {erro && <div className="alert alert--error">{erro}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              required
              placeholder="ex: garcom@bistro.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={carregando}
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              required
              placeholder="••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={carregando}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className={`btn btn--primary ${styles.submitBtn}`}
            disabled={carregando}
          >
            {carregando ? "Entrando..." : "Entrar no Sistema"}
          </button>
        </form>

        <div className={styles.demoBox}>
          <h4>Acesso Rápido para Demonstração:</h4>
          <ul>
            <li>Gerente: <code>gerente@bistro.com</code> (123456)</li>
            <li>Garçom: <code>garcom@bistro.com</code> (123456)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
