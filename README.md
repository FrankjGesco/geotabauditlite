# Geotab Audit Lite v0.8.0

## Cambiamenti principali

1. Rimossi tutti gli indirizzamenti non affidabili.
   - Resta solo `Apri asset`.
   - Rimossi Mappa live, Storico oggi, Apri regole e Problemi.

2. Export migliorato.
   - Scelta formato: CSV, XLSX, PDF.
   - CSV compilato con colonne complete.
   - XLSX generato direttamente dal browser, senza librerie esterne.
   - PDF apre una pagina stampabile: usa "Stampa / Salva PDF" del browser.

3. Colonne export uniformi:
   - Categoria
   - Priorità
   - Asset/Oggetto
   - Problema
   - Evidenza
   - Azione consigliata
   - Device ID
   - Rule ID
   - Stato
   - Exception
   - Asset coinvolti

## File da caricare

- index.html
- style.css
- app.js
- addin_config_example.json
- README.md

## Installazione

Carica i file nella root del repo GitHub Pages, poi aggiorna l'add-in MyGeotab con `addin_config_example.json`.
