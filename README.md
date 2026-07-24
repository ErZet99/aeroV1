# AERO ERP — MVP (frontend)

Pierwsze MVP systemu AERO ERP zgodne z `AERO-ERP-PRD-v1.md`: aplikacja SPA
(React + Vite + TypeScript + Tailwind + shadcn/ui + Zustand + TanStack Table),
**bez backendu** — całość działa na danych mockowych w przeglądarce.

Zakres (główny przepływ): **Zapytania (RFQ)** → **Wycena BOM** (drzewo N-poziomowe,
roll-up / koszt ręczny, porównanie dostawców, szablony) → **Oferta**
(pozycje, rabat, finalizacja z zamrożeniem kosztów, rewizje) + słowniki (CRUD)
i przełącznik ról z ukrywaniem pól finansowych (Zysk / Marża dla roli PRACOWNIK).

## Uruchomienie

```bash
npm install
npm run dev      # serwer deweloperski (http://localhost:5173)
npm test         # testy jednostkowe (vitest)
npm run build    # weryfikacja typów + build produkcyjny
```

## Co jest mockowane

- **Brak API/backendu.** Warstwa `src/api/*` symuluje przyszły REST: każda funkcja
  jest asynchroniczna (sztuczne opóźnienie ~100 ms), więc podmiana na prawdziwy
  backend (Go + Postgres) nie wymaga przebudowy UI.
- **Baza danych** to obiekt w pamięci zapisywany do `localStorage`
  (klucz `aero-erp-db-v2`). Dane startowe: `src/api/seed.ts`.
- Przycisk **„Resetuj dane”** w stopce menu bocznego czyści `localStorage`
  i wczytuje seed od nowa.
- **Logowanie** — brak; role przełącza się selektorem w stopce menu
  (Super Admin / Kierownik / Pracownik).

## Poza zakresem MVP (do realizacji z prawdziwym backendem)

- eksport PDF oferty,
- tworzenie folderów QNAP / linki `aero://`,
- komentarze CRM + potwierdzenia odczytu,
- tłumaczenia EN (UI jest wyłącznie po polsku, przez `react-i18next`),
- prawdziwa autoryzacja (JWT/refresh) i blokada optymistyczna (pola `version`),
- reguły dostawców (SupplierRule), moduł produkcji.

## Otwarte decyzje klienta — markery `TODO(PRD-7.x)` w kodzie

| Marker | Przyjęte założenie MVP | Miejsce w kodzie |
|---|---|---|
| `TODO(PRD-7.1)` | Numer oferty dziedziczony z numeru RFQ (`rfq.numer`) | `src/api/offerService.ts`, `src/types/models.ts` |
| `TODO(PRD-7.2)` | Finalna cena dostawcy trafia do koszyka kosztów wg kodu rodzaju wykonania (KOOPERACJA→Kooperacja, MATERIAL/IMPORT_USA→Materiał, AEROSERVICE24→Produkcja, pozostałe→Materiał) | `src/services/costService.ts` |
| `TODO(PRD-7.3)` | `negocjacje` to kwota doliczana do jednostkowej ceny sprzedaży | `src/types/models.ts` |
