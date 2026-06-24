# Geotab Audit Lite v0.5.0

## Correzioni principali

1. **Nomi regole**
   - aggiunto resolver più robusto dei nomi regola;
   - usa Rule già letti, nomi presenti negli ExceptionEvent e tentativi di Get Rule per id;
   - se il nome non è disponibile, mostra "ID regola: ..." invece di farlo sembrare un nome.

2. **Codici errori / FaultData**
   - aggiunta colonna "Codice / diagnostica";
   - cerca DTC, faultCode, diagnosticCode, SPN, FMI, PGN, source address, class code;
   - se non esiste un codice vero, mostra "Codice non disponibile — [diagnostica]".

3. **Anagrafica cumulata per asset**
   - una riga per asset;
   - i dati mancanti vengono mostrati insieme: VIN mancante, targa mancante, seriale mancante, nessun gruppo operativo;
   - la card ora mostra "X dati da correggere su Y asset".

4. **Gruppi operativi**
   - esclusione gruppi integrati Geotab più esplicita;
   - continua a verificare solo i gruppi operativi veri.

## File da caricare nella root GitHub

- index.html
- style.css
- app.js
- addin_config_example.json
- README.md

## Installazione

1. Carica i file nella root del repository GitHub Pages.
2. MyGeotab > Administration > System > System Settings > Add-Ins.
3. Aggiorna la configurazione con `addin_config_example.json`.
4. Salva.
5. Fai CTRL+F5.
6. Apri Audit Lite.
