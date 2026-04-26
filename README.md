# Amigo Secreto — Sorteador (GitHub Pages)

Web app (PT-BR) para sortear **Amigo Secreto** e gerar **links individuais**: cada pessoa abre seu link e vê apenas quem tirou.

## Como funciona
- Você cola os nomes (1 por linha) e clica em **Sortear**.
- A app cria um `drawId` e monta um sorteio **sem auto-sorteio** e **sem repetição** (mínimo 3 participantes).
- Para cada participante, gera um link `/#/r?...` com o resultado “ofuscado” no próprio URL (não usa servidor).

## Rodar localmente
Requisitos: Node + npm.

```bash
npm install
npm run dev
```

## Deploy (GitHub Pages)
O deploy é automático via GitHub Actions (workflow em `.github/workflows/pages.yml`).

