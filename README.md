# Geotab Audit Lite

Add-in MyGeotab statico, pensato per essere pubblicato su GitHub Pages.

## Cosa fa la versione 0.1.0

Legge direttamente da MyGeotab, usando l'utente già loggato nell'interfaccia:

- `DeviceStatusInfo`
- `Device`

Poi mostra una tabella con problemi base:

- dispositivo non comunicante;
- ultimo dato troppo vecchio;
- stato dispositivo non disponibile;
- seriale mancante;
- VIN mancante;
- gruppi mancanti;
- posizione GPS non disponibile;
- eventi eccezione attivi.

Non modifica dati in MyGeotab.

## File

- `index.html`: pagina add-in completa.
- `addin_config_example.json`: configurazione da incollare in MyGeotab.
- `README.md`: queste istruzioni.

## Pubblicazione su GitHub Pages

1. Crea un repository chiamato `geotabauditlite`.
2. Carica `index.html`.
3. Vai in `Settings > Pages`.
4. Scegli `Deploy from branch`.
5. Branch: `main`.
6. Folder: `/root`.
7. Salva.

L'URL previsto è:

```text
https://forlasifrancesco.github.io/geotabauditlite/index.html
```

Se il tuo username GitHub o repository è diverso, modifica l'URL dentro `addin_config_example.json`.

## Installazione in MyGeotab

1. Apri MyGeotab.
2. Vai in `Administration > System > System Settings > Add-Ins`.
3. Crea un nuovo Add-In.
4. Incolla il contenuto di `addin_config_example.json`.
5. Salva.
6. Aggiorna la pagina.
7. Apri `Audit Lite` dal menu.

## Debug

Se la pagina si apre ma non legge dati:

1. Premi `CTRL + SHIFT + I`.
2. Apri la tab `Console`.
3. Premi `Esegui controllo`.
4. Copia l'errore mostrato in console.

Possibili cause:

- l'utente MyGeotab non ha permessi per leggere Device o DeviceStatusInfo;
- l'URL GitHub Pages non è corretto;
- GitHub Pages non è ancora pubblicato;
- il nome namespace dell'add-in non viene caricato;
- l'istanza MyGeotab blocca add-in esterni o richiede approvazioni interne.

## Note importanti

Questo è un prototipo tecnico. Prima di usarlo come prodotto va testato su una banca dati reale e rifinito su permessi, performance, privacy, UX e gestione errori.
