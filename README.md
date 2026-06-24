# Geotab Audit Lite v0.4.0

Versione più orientata al cliente finale.

## Viste operative

1. Anagrafica
2. Comunicazione
3. Eccezioni & regole
4. Problemi veicolo
5. Tutto

## File da caricare nella root del repository GitHub

- index.html
- style.css
- app.js
- addin_config_example.json
- README.md

## API lette

- Device
- DeviceStatusInfo
- Rule
- ExceptionEvent
- FaultData

## Note

Il controllo gruppi esclude i gruppi integrati Geotab con ID tipo GroupCompanyId, GroupVehicleId, ecc.
FaultData tenta prima il filtro state Active, poi fa fallback sui fault recenti nel periodo se la chiamata viene rifiutata.
