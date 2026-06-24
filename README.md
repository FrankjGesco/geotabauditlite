# Geotab Data Quality Audit v1.0.0

Versione focalizzata sul prodotto vendibile: controllo qualità della banca dati MyGeotab.

## Cosa controlla

- Asset senza seriale dispositivo
- Asset senza VIN
- Asset senza targa, se il campo esiste nella banca dati
- Asset senza gruppo operativo, escludendo gruppi integrati Geotab
- Asset senza DeviceStatusInfo
- Asset non comunicanti
- Asset con ultimo dato più vecchio della soglia configurata

## Cosa è stato rimosso dal core

- Regole rumorose
- Problemi veicolo / FaultData
- Link a mappa, regole, problemi

Resta solo `Apri asset`, perché è il collegamento più affidabile e operativo.

## Export

Formati supportati:

- CSV
- XLSX
- PDF stampabile

Il report esporta solo il piano correzione, con colonne:

- Categoria
- Priorità
- Asset
- Problema
- Evidenza
- Azione consigliata
- Device ID
- Seriale dispositivo
- VIN
- Targa
- Gruppi operativi
- Ultimo dato

## File da caricare

- index.html
- style.css
- app.js
- addin_config_example.json
- README.md

## Installazione

1. Carica i file nella root del repository GitHub Pages.
2. In MyGeotab vai in Administration > System > System Settings > Add-Ins.
3. Aggiorna la configurazione con `addin_config_example.json`.
4. Salva.
5. Fai CTRL+F5.
6. Apri "Data Quality Audit".
