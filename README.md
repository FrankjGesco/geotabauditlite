# Vodafone Automotive Quality Audit v1.1.6

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


## Correzione v1.0.2

- La soglia `Dato vecchio oltre` ora accetta anche 0.
- 0 significa: disattiva il controllo "ultimo dato troppo vecchio".
- La soglia non modifica i casi `Dispositivo non comunicante` o `Stato dispositivo non disponibile`, perché sono problemi indipendenti.
- Dopo aver eseguito il controllo, cambiando la soglia i risultati vengono ricalcolati automaticamente senza dover rilanciare la lettura API.


## Correzione v1.0.2

- Rimosso il campo configurabile `Dato vecchio oltre`.
- Il controllo usa una soglia fissa di 3 giorni.
- Questo rende la UI più semplice per l'utente finale.
- Restano separati i casi:
  - `Dispositivo non comunicante`
  - `Stato dispositivo non disponibile`
  - `Ultimo dato troppo vecchio`


## Aggiornamento v1.1.3

- Il controllo parte automaticamente all’apertura dell’add-in e si aggiorna anche al ritorno sul tab MyGeotab.
- Aggiunto aggiornamento manuale opzionale con pulsante “Aggiorna ora”.
- Separati gli asset attivi senza DeviceStatusInfo dal piano correzione.
- Gli asset senza DeviceStatusInfo non generano anomalie anagrafiche e non entrano nel filtro “Piano correzione” o “Anagrafica”.
- Gli asset con DeviceStatusInfo vengono analizzati sempre in anagrafica; se non comunicano entrano anche nei problemi comunicazione.
- Aggiunta scheda dedicata “Non installati”.
- Aggiunta traduzione automatica IT/EN in base alla lingua rilevata dal profilo/ambiente.
- Corretto export CSV: mantiene la virgola come separatore, ma rimuove virgole interne dai valori per non creare colonne extra in Excel/Text-to-columns.


## Correzione v1.1.6

- Titolo aggiornato a Vodafone Automotive Quality Audit.
- Rimossa etichetta MyGeotab Add-In dall'header.
- Tab e task allineati su Non installati.
- La comunicazione controlla solo `isDeviceCommunicating = false`; rimosso il controllo ultimo dato oltre 3 giorni.
- Footer aggiornato: Add-in in sola lettura. Usa l’utente già loggato. Non salva credenziali e non usa backend.
- Migliorato rilevamento lingua da profilo/state MyGeotab con fallback al browser.


## Correzione v1.1.6

- Rilevamento lingua migliorato: prova prima i dati del profilo utente MyGeotab tramite API User, poi usa state/navigator come fallback.
