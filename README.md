# Geotab Audit Lite v0.2.0

Versione più user-friendly dell'add-in.

## Cambiamenti rispetto alla 0.1.0

- Stile spostato in `style.css`, più compatibile se MyGeotab blocca o ignora CSS inline.
- JavaScript spostato in `app.js`, più facile da mantenere su GitHub.
- Dashboard più leggibile.
- Azioni consigliate aggregate.
- Distribuzione problemi per area.
- Vista "Solo priorità" di default, così non mostra subito tutte le righe informative.
- CSV export.
- Meno duplicazione: se un dispositivo non comunica, l'ultimo dato vecchio viene indicato nella stessa evidenza, non come problema separato.

## File da caricare nel repo GitHub

Carica tutti questi file nella root del repository `geotabauditlite`:

- `index.html`
- `style.css`
- `app.js`
- `addin_config_example.json`

## URL previsto

```text
https://forlasifrancesco.github.io/geotabauditlite/index.html?v=0.2.0
```

Se usi un altro username GitHub o un altro nome repo, modifica l'URL in `addin_config_example.json`.

## Installazione in MyGeotab

1. MyGeotab > Administration > System > System Settings > Add-Ins.
2. Apri il tuo add-in esistente oppure creane uno nuovo.
3. Incolla il contenuto di `addin_config_example.json`.
4. Salva.
5. Aggiorna MyGeotab con CTRL+F5.
6. Apri "Audit Lite".
7. Premi "Esegui controllo".

## Debug

Se vedi ancora la pagina non stilizzata:

1. Apri direttamente questo URL nel browser:
   `https://forlasifrancesco.github.io/geotabauditlite/style.css?v=0.2.0`
2. Se non si apre, GitHub Pages non ha pubblicato il CSS o il file non è nella root.
3. In MyGeotab premi CTRL+SHIFT+I > Console e verifica se ci sono errori su `style.css` o `app.js`.
4. Prova CTRL+F5 per forzare refresh cache.

## Note

L'add-in legge solo `DeviceStatusInfo` e `Device`.
Non modifica dati, non salva password e non usa backend.
