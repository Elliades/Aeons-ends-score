# Aeon's End Tracker — État du projet

> Rapport généré le 17 juin 2026

## Résumé exécutif

| Indicateur | Valeur |
|---|---|
| Version | 0.1.0 |
| Branche | `aeons-end-tracker` |
| Avancement global | ~35 % (Phase 2 sur 7) |
| Tests unitaires | **31/31** passent |
| Tests E2E | **0** (configurés, non implémentés) |
| Build production | ✅ OK (~158 kB JS gzip ~50 kB) |
| Déploiement | Firebase Hosting + Docker/Nginx prêts |

Application **SPA** (Single Page Application) sans routing : une seule page de jeu.

---

## Architecture

### Stack technique

```
┌─────────────────────────────────────────────────────────┐
│                    Navigateur / Mobile                   │
│              (Web, Android/iOS via Capacitor)           │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│  React 18 + TypeScript + Vite                           │
│  Tailwind CSS (thème fantasy/mage sombre)               │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│  Zustand (gameStore)                                   │
│  ├── enemy (boss, powers, minions)                     │
│  ├── turn (placeholder — structure typée)              │
│  ├── stronghold (placeholder — structure typée)        │
│  └── undo/redo (historique 50 états)                   │
└────────────────────────────────────────────────────────┘
```

### Structure des dossiers (réel vs planifié)

| Dossier | Statut |
|---|---|
| `src/components/Enemy/` | ✅ Complet |
| `src/components/Turn/` | ⚠️ Placeholder |
| `src/components/Stronghold/` | ⚠️ Placeholder |
| `src/components/common/` | ✅ Partiel (NumberInput, AddButton) |
| `src/store/` | ✅ Types + store + undoRedo |
| `src/utils/` | ❌ Absent (cardDeck, animations prévus) |
| `src/hooks/` | ❌ Absent (useLongPress, useUndoRedo prévus) |
| `src/styles/` | ❌ Absent (styles dans index.css) |
| `tests/unit/` | ✅ 8 fichiers, 31 tests |
| `tests/e2e/` | ❌ Dossier vide |

### État global (Zustand)

```typescript
GameState {
  enemy:   { boss, powers[], minions[] }     // ✅ Implémenté
  turn:    { currentTurn, drawPile, ... }    // ⚠️ Types seulement
  stronghold: { players[], strongholdLife }  // ⚠️ Types seulement
}
```

Le système **undo/redo** est fonctionnel côté store (historique de 50 snapshots, deep clone JSON) mais **sans contrôles UI** ni raccourcis clavier.

---

## Services & déploiement

### Services applicatifs

| Service | Rôle | Port | Statut |
|---|---|---|---|
| **Vite dev server** | Développement local | 5173 | ✅ `npm run dev` |
| **Nginx (Docker)** | Production statique | 3082→80 | ✅ Configuré |
| **Firebase Hosting** | Hébergement cloud | — | ✅ Configuré (`aeons-end-scoring`) |

### Docker

```yaml
# docker-compose.yml
services:
  web:
    build: .
    image: aeons-end-tracker:latest
    ports: ["3082:80"]
```

- **Dockerfile** : build multi-stage (Node 20 → Nginx Alpine)
- **Healthcheck** : wget sur port 80
- **nginx.conf** : SPA fallback (`try_files → index.html`)

### Firebase

- Projet : `aeons-end-scoring`
- Dossier public : `dist/`
- Rewrite SPA : toutes les routes → `/index.html`
- Commande : `npm run deploy`

### Capacitor (mobile)

- Config présente (`com.aeonsend.tracker`)
- Plateformes **android/ios non ajoutées** (`npx cap add` non exécuté)
- `webDir: dist`

### Ce qui n'existe pas

- Pas de backend / API
- Pas de base de données
- Pas de service worker / PWA
- Pas de CI/CD (GitHub Actions, etc.)
- Pas de persistance locale (localStorage)

---

## Pages web

Application **monopage** — pas de React Router.

```
App.tsx
 └── Layout.tsx
      ├── EnemySection     ← ENEMY (haut)
      ├── TurnSection      ← TURN (centre, numéro géant)
      └── StrongholdSection ← STRONGHOLD (bas)
```

### Détail par section

#### ENEMY — ✅ Fonctionnel

| Composant | Fonctionnalité |
|---|---|
| `Boss` | Score +/- via NumberInput |
| `Powers` | Ajout dynamique (pA, pB…), timers +/- |
| `PowerCard` | Animation pulse quand timer = 0 |
| `Minions` | Ajout dynamique (A, B, C…), vie +/- |
| `MinionCard` | Mort à 0 PV, animation ping, auto-suppression |

#### TURN — ⚠️ Placeholder

- Affiche uniquement `currentTurn` (défaut : 1) en très grand
- Message « Turn tracker coming soon »
- Manque : deck Fisher-Yates, séquence de cartes, avancement au tap, reset de manche

#### STRONGHOLD — ⚠️ Placeholder

- Titre + vie fixée à `0`
- Message « Players coming soon »
- Manque : joueurs (nom, vie, charge), édition avancée

#### Composants communs

| Composant | Statut |
|---|---|
| `NumberInput` | ✅ Tap +/- |
| `AddButton` | ✅ Bouton pointillé |
| `ValueEditor` | ❌ Long press / modal absent |
| Boutons Undo/Redo | ❌ Absents |

---

## Tests

| Suite | Fichiers | Tests | Statut |
|---|---|---|---|
| Store (gameStore, undoRedo, powers, minions) | 4 | 19 | ✅ |
| Composants (Layout, Boss, PowerCard, MinionCard) | 4 | 12 | ✅ |
| E2E Playwright | 0 | 0 | ❌ |

**Couverture estimée** : ~40 % du code existant (sections Turn/Stronghold non testées car absentes).

Avertissements `act(...)` dans les tests Boss (non bloquant).

---

## Analyse critique

### ✅ Points forts

1. **Fondations solides** — Stack moderne, légère, bien documentée (ARCHITECTURE.md, .cursorrules)
2. **Store bien typé** — TypeScript strict, interfaces claires, séparation types/store/undoRedo
3. **Undo/redo robuste** — Logique extraite et testée (5 tests dédiés)
4. **Section ENEMY aboutie** — UX cohérente, animations, nommage auto, tests complets
5. **TDD partiellement respecté** — 31 tests pour les features implémentées
6. **Multi-déploiement** — Docker + Firebase + Capacitor préparés
7. **Build rapide** — Bundle ~50 kB gzip, build < 2 s
8. **Thème cohérent** — Palette mage/fantasy, classes `.card`, animations Tailwind

### ⚠️ À améliorer (priorité haute)

1. **README trompeur** — Annonce Turn, Stronghold, Undo/Redo UI comme disponibles ; à corriger
2. **Pas de tests E2E** — Playwright configuré mais `tests/e2e/` vide
3. **Turn & Stronghold** — Cœur gameplay manquant (~50 % des features)
4. **Undo/redo invisible** — Logique store sans boutons ni Ctrl+Z
5. **Duplication store** — Chaque action répète le pattern `saveToHistory` (~15×) ; extraire un helper `withHistory()`
6. **Dépôt Git à la racine `$HOME`** — Risque majeur : fichiers personnels non ignorés ; idéalement déplacer le projet dans un sous-dossier dédié

### ⚠️ À améliorer (priorité moyenne)

7. **Touch targets** — Boutons power/minion 24×24 px (< 44 px recommandé mobile)
8. **Pas de persistance** — Refresh = perte totale de la partie
9. **Long press absent** — ValueEditor et useLongPress non implémentés
10. **Dossiers manquants** — `utils/cardDeck.ts`, `hooks/useLongPress.ts` prévus mais absents
11. **Power timer auto-decrease** — Non lié au tour Nemesis
12. **Pas de PWA** — Pas de manifest ni service worker

### 💡 Améliorations futures (priorité basse)

13. **Refactoring store** — Middleware Zustand pour l'historique
14. **CI/CD** — Pipeline test + build + deploy
15. **Capacitor** — Ajouter plateformes, icônes, splash screens
16. **Accessibilité** — Navigation clavier, focus visible
17. **i18n** — Interface en français/anglais

---

## Roadmap recommandée

```
Phase 1 — TURN          ████░░░░░░  0%   ← Priorité #1
Phase 2 — STRONGHOLD    ████░░░░░░  0%   ← Priorité #2
Phase 3 — UX avancée    ██░░░░░░░░  20%  (undo UI, long press)
Phase 4 — Polish        ███░░░░░░░  30%  (animations partielles)
Phase 5 — Mobile        █░░░░░░░░░  10%  (config seulement)
Phase 6 — QA            ██░░░░░░░░  20%  (unit OK, E2E absent)
Phase 7 — Release       ░░░░░░░░░░  0%
```

---

## Commandes utiles

```bash
npm run dev          # Dev local :5173
npm test -- --run    # Tests unitaires
npm run build        # Build production
npm run preview      # Preview build
npm run deploy       # Firebase Hosting
docker compose up    # Production locale :3082
```
