# Geotab Audit Lite v0.7.0

## Correzioni principali

1. Regole rumorose:
   - Il pulsante "Apri regole" ora viene mostrato anche nella sezione Regole rumorose.
   - Il numero di exception non resta più vuoto: viene salvato come `exceptionCount`.
   - Dove possibile viene passato anche `ruleId`.

2. Mappa:
   - "Mappa" diventa "Mappa live" e viene mostrata solo quando l'asset ha coordinate disponibili nello stato corrente.
   - Se non ci sono coordinate, viene mostrato "Storico oggi", che prova ad aprire lo storico viaggi dell'asset.
   - La mappa usa il formato documentato da Geotab: `#map,liveVehicleIds:!(deviceId)`.

3. Problemi veicolo:
   - Il pulsante "Problemi" non prova più a filtrare l'asset con parametri non documentati.
   - Apre la pagina problemi generica in modo più sicuro.
   - Per correggere il singolo veicolo usa "Apri asset".
   - Per filtrare la pagina Problems/Faults direttamente sull'asset serve copiare l'hash URL di MyGeotab dopo aver filtrato manualmente un asset.

4. Stabilità navigazione:
   - Tutte le aperture sono avvolte in `gotoPageSafe`, così un page id non supportato non dovrebbe più generare errore bloccante dell'add-in.

## File da caricare

- index.html
- style.css
- app.js
- addin_config_example.json
- README.md

## Installazione

Carica i file nella root di GitHub Pages, poi aggiorna la configurazione add-in in MyGeotab con `addin_config_example.json`.
