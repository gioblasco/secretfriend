import { useMemo, useState } from "react";
import { makeSecretFriendPairs } from "../lib/draw";
import { encodeNameForUrl, encodeToken } from "../lib/codec";
import { randomIdBase36 } from "../lib/random";
import "../styles/home.css";

type LinkRow = {
  giver: string;
  receiver: string;
  url: string;
};

function normalizeName(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function parseParticipants(text: string) {
  const raw = text
    .split(/\r?\n/)
    .map(normalizeName)
    .filter(Boolean);

  const seen = new Map<string, string>();
  const duplicates: string[] = [];
  const unique: string[] = [];

  for (const name of raw) {
    const key = name.toLocaleLowerCase("pt-BR");
    const prev = seen.get(key);
    if (prev) {
      duplicates.push(name);
      continue;
    }
    seen.set(key, name);
    unique.push(name);
  }

  return { unique, duplicates };
}

function buildResultUrl(drawId: string, giver: string, receiver: string) {
  const d = encodeURIComponent(drawId);
  const g = encodeURIComponent(encodeNameForUrl(giver));
  const t = encodeURIComponent(encodeToken(drawId, receiver));
  return `${window.location.origin}${window.location.pathname}#/r?d=${d}&g=${g}&t=${t}`;
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export function Home() {
  const [namesText, setNamesText] = useState("");
  const [drawId, setDrawId] = useState<string | null>(null);
  const [rows, setRows] = useState<LinkRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const parsed = useMemo(() => parseParticipants(namesText), [namesText]);

  const canDraw =
    parsed.unique.length >= 3 && parsed.duplicates.length === 0 && parsed.unique.length <= 200;

  function onDraw() {
    try {
      setError(null);
      setCopiedKey(null);

      const id = randomIdBase36(12);
      const pairs = makeSecretFriendPairs(id, parsed.unique);

      const map = new Map(pairs.map((p) => [p.giver, p.receiver]));
      const list: LinkRow[] = parsed.unique.map((giver) => {
        const receiver = map.get(giver);
        if (!receiver) throw new Error("Sorteio incompleto. Tente novamente.");
        return { giver, receiver, url: buildResultUrl(id, giver, receiver) };
      });

      setDrawId(id);
      setRows(list);
    } catch (e) {
      setDrawId(null);
      setRows(null);
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    }
  }

  async function onCopyLink(giver: string, url: string) {
    await copyToClipboard(url);
    setCopiedKey(giver);
    setTimeout(() => setCopiedKey((k) => (k === giver ? null : k)), 1200);
  }

  async function onCopyAll() {
    if (!rows) return;
    const text = rows.map((r) => `${r.giver}: ${r.url}`).join("\n");
    await copyToClipboard(text);
    setCopiedKey("__all__");
    setTimeout(() => setCopiedKey((k) => (k === "__all__" ? null : k)), 1200);
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark" aria-hidden />
          <div>
            <div className="brandTitle">Amigo Secreto</div>
            <div className="brandSubtitle">Sorteador com links individuais</div>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="card">
          <h1 className="h1">Criar sorteio</h1>
          <p className="muted">
            Cole os nomes (um por linha). Ao sortear, você gera um link para cada pessoa descobrir
            quem ela tirou.
          </p>

          <label className="label" htmlFor="names">
            Participantes
          </label>
          <textarea
            id="names"
            className="textarea"
            placeholder={"Ex:\nAna\nBruno\nCarla\nDiego"}
            value={namesText}
            onChange={(e) => setNamesText(e.target.value)}
            rows={10}
          />

          <div className="metaRow">
            <div className="meta">
              <span className="metaLabel">Total</span>
              <span className="metaValue">{parsed.unique.length}</span>
            </div>
            <div className="meta">
              <span className="metaLabel">Duplicados</span>
              <span className={parsed.duplicates.length ? "metaValue bad" : "metaValue"}>
                {parsed.duplicates.length}
              </span>
            </div>
            <div className="meta">
              <span className="metaLabel">Mínimo</span>
              <span className="metaValue">3</span>
            </div>
          </div>

          {parsed.duplicates.length > 0 ? (
            <div className="callout warn">
              Remova nomes duplicados (ignorando maiúsculas/minúsculas) para sortear.
            </div>
          ) : null}

          {parsed.unique.length > 0 && parsed.unique.length < 3 ? (
            <div className="callout warn">Adicione pelo menos 3 participantes.</div>
          ) : null}

          {error ? <div className="callout err">{error}</div> : null}

          <div className="actions">
            <button className="btn primary" onClick={onDraw} disabled={!canDraw}>
              Sortear
            </button>
            <button
              className="btn"
              onClick={() => {
                setNamesText("");
                setRows(null);
                setDrawId(null);
                setError(null);
              }}
            >
              Limpar
            </button>
          </div>
        </section>

        {rows ? (
          <section className="card">
            <div className="resultHeader">
              <div>
                <h2 className="h2">Links gerados</h2>
                <p className="muted">
                  Envie <strong>apenas o link</strong> para a pessoa correspondente. Não compartilhe
                  o seu próprio link.
                </p>
              </div>
              <div className="resultTools">
                <button className="btn" onClick={onCopyAll}>
                  {copiedKey === "__all__" ? "Copiado!" : "Copiar todos"}
                </button>
              </div>
            </div>

            <div className="drawIdRow">
              <span className="pill">
                Sorteio: <strong>{drawId}</strong>
              </span>
            </div>

            <div className="grid">
              {rows.map((r) => (
                <div key={r.giver} className="linkCard">
                  <div className="linkTop">
                    <div className="linkName">{r.giver}</div>
                    <button className="btn small" onClick={() => onCopyLink(r.giver, r.url)}>
                      {copiedKey === r.giver ? "Copiado!" : "Copiar link"}
                    </button>
                  </div>
                  <div className="linkUrl" title={r.url}>
                    {r.url}
                  </div>
                  <div className="linkHint">
                    (Dica: abra em aba anônima para conferir que funciona.)
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="footer">
        <span className="muted">Feito para sorteios simples de Amigo Secreto (BR).</span>
      </footer>
    </div>
  );
}

