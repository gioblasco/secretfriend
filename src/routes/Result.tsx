import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { decodeNameFromUrl, decodeToken } from "../lib/codec";
import "../styles/result.css";

function getParam(sp: URLSearchParams, key: string) {
  const v = sp.get(key);
  return v && v.trim().length ? v : null;
}

export function Result() {
  const [sp] = useSearchParams();

  const parsed = useMemo(() => {
    const d = getParam(sp, "d");
    const g = getParam(sp, "g");
    const t = getParam(sp, "t");

    if (!d || !g || !t) {
      return { ok: false as const, message: "Este link está incompleto ou inválido." };
    }

    try {
      const giver = decodeNameFromUrl(decodeURIComponent(g));
      const receiver = decodeToken(decodeURIComponent(d), decodeURIComponent(t));
      if (!giver || !receiver) {
        return { ok: false as const, message: "Não foi possível ler este link." };
      }
      return { ok: true as const, giver, receiver };
    } catch {
      return { ok: false as const, message: "Não foi possível ler este link." };
    }
  }, [sp]);

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark" aria-hidden />
          <div>
            <div className="brandTitle">Amigo Secreto</div>
            <div className="brandSubtitle">Seu resultado</div>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="card">
          {parsed.ok ? (
            <>
              <div className="hello">Olá, <strong>{parsed.giver}</strong>.</div>
              <div className="bigCard">
                <div className="bigLabel">Você tirou</div>
                <div className="bigName">{parsed.receiver}</div>
              </div>
              <div className="callout warn">
                Não encaminhe este link. Se outra pessoa abrir, ela também verá o seu resultado.
              </div>
              <div className="actions">
                <Link className="btn primary" to="/">
                  Criar novo sorteio
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="h1">Link inválido</h1>
              <p className="muted">{parsed.message}</p>
              <div className="actions">
                <Link className="btn primary" to="/">
                  Voltar
                </Link>
              </div>
            </>
          )}
        </section>
      </main>

    </div>
  );
}

