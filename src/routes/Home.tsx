import { useEffect, useMemo, useState } from "react";
import { makeSecretFriendPairs } from "../lib/draw";
import { encodeNameForUrl, encodeToken } from "../lib/codec";
import { randomIdBase36 } from "../lib/random";
import { importParticipantsFromFile } from "../lib/importParticipants";
import "../styles/home.css";

type Participant = {
  id: string;
  name: string;
  phone: string;
};

type LinkRow = {
  giver: string;
  phone: string;
  receiver: string;
  url: string;
};

type ThemeOption = {
  id: ThemeId;
  label: string;
  icon: string;
};

type ThemeId = "christmas" | "midnight" | "sunset";

const THEME_STORAGE_KEY = "secret-friend-theme";

const THEME_OPTIONS: ThemeOption[] = [
  { id: "christmas", label: "Tema de Natal", icon: "🎄" },
  { id: "midnight", label: "Tema noturno", icon: "🌙" },
  { id: "sunset", label: "Tema pôr do sol", icon: "🌅" },
];

function normalizeName(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function normalizePhoneDigits(s: string) {
  return s.replace(/\D/g, "");
}

function formatPhoneInput(value: string) {
  const digits = normalizePhoneDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isThemeId(value: string | null): value is ThemeId {
  return THEME_OPTIONS.some((theme) => theme.id === value);
}

function makeEmptyParticipant(): Participant {
  return { id: crypto.randomUUID(), name: "", phone: "" };
}

function validateParticipants(participants: Participant[]) {
  const filled = participants
    .map((p) => ({ ...p, name: normalizeName(p.name), phone: normalizePhoneDigits(p.phone) }))
    .filter((p) => p.name.length > 0);

  const seen = new Map<string, string>();
  const duplicates: string[] = [];
  const uniqueNames: string[] = [];

  for (const p of filled) {
    const key = p.name.toLocaleLowerCase("pt-BR");
    const prev = seen.get(key);
    if (prev) {
      duplicates.push(p.name);
      continue;
    }
    seen.set(key, p.name);
    uniqueNames.push(p.name);
  }

  return { filled, uniqueNames, duplicates };
}

function buildResultUrl(drawId: string, giver: string, receiver: string) {
  const d = encodeURIComponent(drawId);
  const g = encodeURIComponent(encodeNameForUrl(giver));
  const t = encodeURIComponent(encodeToken(drawId, receiver));
  return `${window.location.origin}${window.location.pathname}#/r?d=${d}&g=${g}&t=${t}`;
}

function isValidBrMobile(digits: string) {
  // BR-only, expecting DDD+number (10 or 11 digits without country code).
  // ex: 11999998888 or 1133334444
  return digits.length === 10 || digits.length === 11;
}

function buildWhatsAppUrl(phoneDigitsBr: string, message: string) {
  const phone = `55${phoneDigitsBr}`;
  const text = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${text}`;
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export function Home() {
  const [theme, setTheme] = useState<ThemeId>(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : "christmas";
  });
  const [participants, setParticipants] = useState<Participant[]>(() => [
    makeEmptyParticipant(),
    makeEmptyParticipant(),
    makeEmptyParticipant(),
  ]);
  const [drawId, setDrawId] = useState<string | null>(null);
  const [rows, setRows] = useState<LinkRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const validated = useMemo(() => validateParticipants(participants), [participants]);

  useEffect(() => {
    document.body.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const canDraw =
    validated.uniqueNames.length >= 3 &&
    validated.duplicates.length === 0 &&
    validated.uniqueNames.length <= 200;

  function onDraw() {
    try {
      setError(null);
      setCopiedKey(null);

      const id = randomIdBase36(12);
      const pairs = makeSecretFriendPairs(id, validated.uniqueNames);

      const map = new Map(pairs.map((p) => [p.giver, p.receiver]));
      const byName = new Map(
        validated.filled.map((p) => [normalizeName(p.name).toLocaleLowerCase("pt-BR"), p]),
      );

      const list: LinkRow[] = validated.uniqueNames.map((giver) => {
        const receiver = map.get(giver);
        if (!receiver) throw new Error("Sorteio incompleto. Tente novamente.");
        const p = byName.get(giver.toLocaleLowerCase("pt-BR"));
        return {
          giver,
          phone: p?.phone ?? "",
          receiver,
          url: buildResultUrl(id, giver, receiver),
        };
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

  function onSendWhatsApp(row: LinkRow) {
    const digits = normalizePhoneDigits(row.phone);
    if (!isValidBrMobile(digits)) return;

    const message = `Oi, ${row.giver}! Seu link do Amigo Secreto é: ${row.url}\n\nAbra para ver quem você tirou.`;
    const wa = buildWhatsAppUrl(digits, message);
    window.open(wa, "_blank", "noopener,noreferrer");
  }

  function updateParticipant(id: string, patch: Partial<Participant>) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addRow() {
    setParticipants((prev) => [...prev, makeEmptyParticipant()]);
  }

  function removeRow(id: string) {
    setParticipants((prev) => {
      if (prev.length <= 3) return prev;
      return prev.filter((p) => p.id !== id);
    });
  }

  async function onImportFile(file: File) {
    try {
      setError(null);
      setCopiedKey(null);
      setRows(null);
      setDrawId(null);

      const imported = await importParticipantsFromFile(file);
      const next: Participant[] =
        imported.length > 0
          ? imported.map((r) => ({
              id: crypto.randomUUID(),
              name: r.name,
              phone: formatPhoneInput(r.phone),
            }))
          : [makeEmptyParticipant(), makeEmptyParticipant(), makeEmptyParticipant()];

      while (next.length < 3) next.push(makeEmptyParticipant());
      setParticipants(next);
    } catch {
      setError("Não foi possível importar o arquivo. Verifique o formato e tente novamente.");
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brandBlock">
          <div className="brandTitle">Amigo Secreto</div>
        </div>
      </header>

      <main className="container">
        <section className="card">
          <h1 className="h1">Criar sorteio</h1>
          <p className="muted">
            Preencha pelo menos 3 participantes. Ao sortear, você gera um link para cada pessoa
            descobrir quem ela tirou.
          </p>

          <div className="importRow">
            <label className="btn small fileBtn">
              Importar arquivo
              <input
                title="Arquivo .xlsx ou .csv com: Coluna A = Nome, Coluna B = Celular com DDD (ex: 11999998888)."
                className="fileInput"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onImportFile(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          <div className="participantsHeader">
            <div className="label" style={{ margin: 0 }}>
              Participantes
            </div>
            <button className="btn small" onClick={addRow} type="button">
              + Adicionar
            </button>
          </div>

          <div className="participantsTable" role="table" aria-label="Participantes">
            <div className="participantsRow head" role="row">
              <div className="cell" role="columnheader">
                Nome
              </div>
              <div className="cell" role="columnheader">
                Celular
              </div>
              <div className="cell actionsCell" role="columnheader">
                Ações
              </div>
            </div>

            {participants.map((p, idx) => (
              <div className="participantsRow" role="row" key={p.id}>
                <div className="cell" role="cell">
                  <input
                    className="input"
                    inputMode="text"
                    autoComplete="off"
                    placeholder={`Participante ${idx + 1}`}
                    value={p.name}
                    onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                  />
                </div>
                <div className="cell" role="cell">
                  <input
                    className="input"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="(DDD) 9xxxx-xxxx"
                    value={p.phone}
                    onChange={(e) => updateParticipant(p.id, { phone: formatPhoneInput(e.target.value) })}
                  />
                </div>
                <div className="cell actionsCell" role="cell">
                  <button
                    className="btn small"
                    type="button"
                    onClick={() => removeRow(p.id)}
                    disabled={participants.length <= 3}
                    aria-label="Remover participante"
                    title={participants.length <= 3 ? "Mínimo de 3 participantes" : "Remover"}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="metaRow">
            <div className="meta">
              <span className="metaLabel">Total</span>
              <span className="metaValue">{validated.uniqueNames.length}</span>
            </div>
            <div className="meta">
              <span className="metaLabel">Duplicados</span>
              <span className={validated.duplicates.length ? "metaValue bad" : "metaValue"}>
                {validated.duplicates.length}
              </span>
            </div>
            <div className="meta">
              <span className="metaLabel">Mínimo</span>
              <span className="metaValue">3</span>
            </div>
          </div>

          {validated.duplicates.length > 0 ? (
            <div className="callout warn">
              Remova nomes duplicados (ignorando maiúsculas/minúsculas) para sortear.
            </div>
          ) : null}

          {validated.uniqueNames.length > 0 && validated.uniqueNames.length < 3 ? (
            <div className="callout warn">Adicione pelo menos 3 participantes.</div>
          ) : null}

          {error ? <div className="callout err">{error}</div> : null}

          <div className="actions">
            <button className="btn primary" onClick={onDraw} disabled={!canDraw}>
              Sortear
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                setParticipants([makeEmptyParticipant(), makeEmptyParticipant(), makeEmptyParticipant()]);
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
                    <div className="linkActions">
                      <button className="btn small" onClick={() => onCopyLink(r.giver, r.url)}>
                        {copiedKey === r.giver ? "Copiado!" : "Copiar link"}
                      </button>
                      <button
                        className="btn small"
                        onClick={() => onSendWhatsApp(r)}
                        disabled={!isValidBrMobile(normalizePhoneDigits(r.phone))}
                        title={
                          isValidBrMobile(normalizePhoneDigits(r.phone))
                            ? "Abrir WhatsApp"
                            : "Preencha o celular com DDD (ex: 11999998888)"
                        }
                      >
                        WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="footer footerThemes">
        <div className="themePicker subtle" aria-label="Escolher tema">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={theme === option.id ? "themeChip active" : "themeChip"}
              onClick={() => setTheme(option.id)}
              aria-pressed={theme === option.id}
              aria-label={option.label}
              title={option.label}
            >
              <span aria-hidden="true" className="themeChipIcon">
                {option.icon}
              </span>
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
