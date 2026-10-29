"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./Navbar.module.scss";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Não exibe a Navbar na tela de login
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (isLoginPage) return;

    let montado = true;
    async function carregarUsuario() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const dados = await res.json();
          if (montado) setUsuario(dados);
        } else {
          if (montado) setUsuario(null);
        }
      } catch {
        if (montado) setUsuario(null);
      } finally {
        if (montado) setCarregando(false);
      }
    }

    carregarUsuario();

    return () => {
      montado = false;
    };
  }, [pathname, isLoginPage]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUsuario(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Erro ao sair:", err);
      router.push("/login");
    }
  }

  if (isLoginPage) return null;

  return (
    <header className={styles.navbar}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>☕</span>
          <div>
            <span>Sabor Local</span>
            <span className={styles.brandSub}>Pequeno Bistrô</span>
          </div>
        </div>

        <nav aria-label="Navegação principal">
          <ul className={styles.navLinks}>
            {usuario?.role === "garcom" && (
              <>
                <li className={styles.navItem}>
                  <Link
                    href="/pedidos/novo"
                    className={`${styles.navLink} ${
                      pathname === "/pedidos/novo" ? styles.active : ""
                    }`}
                  >
                    Novo Pedido
                  </Link>
                </li>
                <li className={styles.navItem}>
                  <Link
                    href="/pedidos"
                    className={`${styles.navLink} ${
                      pathname === "/pedidos" ? styles.active : ""
                    }`}
                  >
                    Meus Pedidos
                  </Link>
                </li>
                <li className={styles.navItem}>
                  <Link
                    href="/cozinha"
                    className={`${styles.navLink} ${
                      pathname === "/cozinha" ? styles.active : ""
                    }`}
                  >
                    Cozinha
                  </Link>
                </li>
              </>
            )}

            {usuario?.role === "gerente" && (
              <>
                <li className={styles.navItem}>
                  <Link
                    href="/pedidos"
                    className={`${styles.navLink} ${
                      pathname === "/pedidos" ? styles.active : ""
                    }`}
                  >
                    Pedidos
                  </Link>
                </li>
                <li className={styles.navItem}>
                  <Link
                    href="/pedidos/novo"
                    className={`${styles.navLink} ${
                      pathname === "/pedidos/novo" ? styles.active : ""
                    }`}
                  >
                    Novo Pedido
                  </Link>
                </li>
                <li className={styles.navItem}>
                  <Link
                    href="/cozinha"
                    className={`${styles.navLink} ${
                      pathname === "/cozinha" ? styles.active : ""
                    }`}
                  >
                    Cozinha
                  </Link>
                </li>
                <li className={styles.navItem}>
                  <Link
                    href="/cardapio"
                    className={`${styles.navLink} ${
                      pathname === "/cardapio" ? styles.active : ""
                    }`}
                  >
                    Cardápio
                  </Link>
                </li>
                <li className={styles.navItem}>
                  <Link
                    href="/faturamento"
                    className={`${styles.navLink} ${
                      pathname === "/faturamento" ? styles.active : ""
                    }`}
                  >
                    Faturamento
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        {usuario && (
          <div className={styles.userInfo}>
            <div className={styles.userBadge}>
              <span className={styles.userName}>{usuario.nome}</span>
              <span
                className={`${styles.userRole} ${
                  usuario.role === "gerente" ? styles.gerente : styles.garcom
                }`}
              >
                {usuario.role === "gerente" ? "Gerente" : "Garçom"}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className={styles.logoutBtn}
              title="Encerrar sessão"
            >
              Sair ⎋
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
