# Geotab Audit Lite v0.3.0

## Correzioni principali

1. Nomi asset coerenti:
   - prima alcuni DeviceStatusInfo mostravano solo l'id perché l'oggetto status non sempre contiene il nome completo;
   - ora l'add-in crea una mappa Device.id -> Device.name e usa sempre il nome dal Device completo quando disponibile.

2. Area "Regole" chiarita:
   - nella 0.2.x veniva mostrata come "Regole", ma in realtà erano ExceptionEvents attivi dentro DeviceStatusInfo;
   - ora l'area si chiama "Eventi attivi" e l'evidenza spiega che non sono regole lette dall'API Rule.

3. Filtri più coerenti:
   - la distribuzione problemi conta solo i problemi visibili secondo vista e filtri attivi;
   - se in "Solo priorità" filtri un'area che contiene solo informativi, viene mostrato un messaggio che invita a passare a "Tutti i problemi".

4. Score più trasparente:
   - lo score è calcolato su asset unici impattati, non sul numero puro di righe;
   - la UI mostra la formula applicata ai dati.

## File da caricare nella root del repository

- index.html
- style.css
- app.js
- addin_config_example.json
- README.md

## Installazione

1. Carica i file nel repo GitHub Pages.
2. In MyGeotab vai in Administration > System > System Settings > Add-Ins.
3. Aggiorna la configurazione con addin_config_example.json.
4. Salva e fai CTRL+F5.
5. Apri Audit Lite.

## Nota

L'add-in legge DeviceStatusInfo e Device. Non modifica dati, non salva password e non usa backend.
