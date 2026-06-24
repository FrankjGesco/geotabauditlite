# Geotab Audit Lite v0.6.0

## Novità

- Aggiunti pulsanti **Apri asset** nelle righe asset/anagrafica/comunicazione/fault.
- Aggiunto pulsante **Mappa** per aprire il veicolo sulla mappa live quando disponibile.
- Aggiunto pulsante **Apri regole** nella tabella regole rumorose.
- Aggiunto pulsante **Apri problemi** nella sezione problemi veicolo.
- UI più orientata al workflow: leggi problema -> apri schermata MyGeotab -> correggi.

## Navigazione

L'add-in usa `state.gotoPage("device", { id: deviceId })` per aprire la scheda asset.
Per la mappa usa `state.gotoPage("map", { liveVehicleIds: "!(deviceId)" })`.

Per le regole e i problemi veicolo MyGeotab può variare per versione/interfaccia: se il pulsante non apre la schermata corretta, annota l'hash URL della pagina manuale e aggiornalo in `openRulesPage()` o `openFaultsPage()` in `app.js`.

## File da caricare nella root del repository GitHub

- index.html
- style.css
- app.js
- addin_config_example.json
- README.md

## Installazione

1. Carica i file nel repository GitHub Pages.
2. MyGeotab > Administration > System > System Settings > Add-Ins.
3. Aggiorna la configurazione con `addin_config_example.json`.
4. Salva.
5. Fai CTRL+F5.
6. Apri Audit Lite.
