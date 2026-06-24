(function () {
  "use strict";

  var ADDIN_NAMESPACE = "geotabauditlite";
  var pageState = null;

  var deviceById = {};
  var statusByDeviceId = {};
  var planRows = [];
  var dataRows = [];
  var communicationRows = [];
  var cleanRows = [];
  var exportRows = [];
  var showPlanMode = "fix";

  function byId(id) { return document.getElementById(id); }
  function setText(id, value) { byId(id).textContent = value; }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function jsAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function hasValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
  }

  function safeDate(value) {
    if (!value) return null;
    var d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  function formatDate(value) {
    var d = safeDate(value);
    if (!d) return "Non disponibile";
    try { return d.toLocaleString(); } catch (e) { return String(value); }
  }

  function daysOld(dateValue) {
    var d = safeDate(dateValue);
    if (!d) return null;
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getNumberInput(id, fallback) {
    var value = parseInt(byId(id).value, 10);
    if (isNaN(value) || value < 1) return fallback;
    return value;
  }

  function entityId(entity) {
    if (!entity) return "";
    if (typeof entity === "string") return entity;
    if (entity.id) {
      if (typeof entity.id === "string") return entity.id;
      if (entity.id.id) return entity.id.id;
      return String(entity.id);
    }
    return "";
  }

  function preferredDeviceName(device) {
    if (!device) return "";
    if (device.name) return device.name;
    if (device.serialNumber) return device.serialNumber;
    if (device.vehicleIdentificationNumber) return device.vehicleIdentificationNumber;
    if (entityId(device)) return entityId(device);
    return "";
  }

  function isActiveDevice(device) {
    if (!device || entityId(device) === "NoDeviceId") return false;

    var now = new Date();
    var activeFrom = safeDate(device.activeFrom);
    var activeTo = safeDate(device.activeTo);

    if (activeFrom && activeFrom > now) return false;
    if (activeTo && activeTo < now) return false;

    return true;
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isBuiltInGroup(group) {
    if (!group) return true;

    var id = String(group.id || "");
    var name = normalize(group.name);

    if (group.isSystem || group.system) return true;

    if (/^Group[A-Za-z0-9]+Id$/.test(id)) return true;

    var builtInNames = [
      "company group",
      "entire organization",
      "entire organisation",
      "vehicle",
      "vehicles",
      "asset",
      "assets",
      "trailer",
      "trailers",
      "driver",
      "drivers",
      "azienda",
      "gruppo azienda",
      "veicolo",
      "veicoli",
      "rimorchi",
      "conducenti"
    ];

    return builtInNames.indexOf(name) !== -1;
  }

  function operationalGroups(groups) {
    if (!groups || !groups.length) return [];
    return groups.filter(function (g) { return !isBuiltInGroup(g); });
  }

  function getLicencePlate(device) {
    return device.licensePlate || device.licencePlate || "";
  }

  function hasLicenceField(devices) {
    return devices.some(function (d) {
      return Object.prototype.hasOwnProperty.call(d, "licensePlate") ||
             Object.prototype.hasOwnProperty.call(d, "licencePlate");
    });
  }

  function apiGet(api, typeName, search, resultsLimit) {
    return new Promise(function (resolve, reject) {
      api.call(
        "Get",
        { typeName: typeName, search: search || {}, resultsLimit: resultsLimit || 5000 },
        function (result) { resolve(result || []); },
        function (error) { reject(error); }
      );
    });
  }

  async function safeApiGet(api, typeName, search, resultsLimit) {
    try {
      var data = await apiGet(api, typeName, search, resultsLimit);
      return { ok: true, data: data, error: null };
    } catch (e) {
      console.error("Errore lettura " + typeName, e);
      return { ok: false, data: [], error: e };
    }
  }

  function buildMaps(activeDevices, statuses) {
    deviceById = {};
    activeDevices.forEach(function (device) {
      var id = entityId(device);
      if (id) deviceById[id] = device;
    });

    statusByDeviceId = {};
    statuses.forEach(function (status) {
      var id = entityId(status.device);
      if (id) statusByDeviceId[id] = status;
    });
  }

  function canUseState() {
    return pageState && typeof pageState.gotoPage === "function";
  }

  function openDevicePage(deviceId) {
    if (!deviceId) {
      alert("ID asset non disponibile per questa riga.");
      return;
    }

    try {
      if (canUseState()) {
        pageState.gotoPage("device", { id: deviceId });
      } else {
        window.location.hash = "#device,id:" + deviceId;
      }
    } catch (e) {
      console.warn("Navigazione asset non riuscita", e);
      alert("Non riesco ad aprire automaticamente l'asset. Prova ad aprirlo manualmente da MyGeotab.");
    }
  }

  function openCell(row) {
    if (!row.deviceId) return "<span class='meta'>N/D</span>";
    return "<button class='row-link primary js-open-device' data-device-id='" + jsAttr(row.deviceId) + "'>Apri asset</button>";
  }

  function getSearchText() {
    return byId("globalSearch").value.trim().toLowerCase();
  }

  function rowMatches(row, query) {
    if (!query) return true;

    var text = [
      row.assetName,
      row.serialNumber,
      row.vin,
      row.licensePlate,
      row.missingLabels && row.missingLabels.join(" "),
      row.communicationProblem,
      row.evidence,
      row.action,
      row.operationalGroupNames && row.operationalGroupNames.join(" ")
    ].join(" ").toLowerCase();

    return text.indexOf(query) !== -1;
  }

  function analyse(activeDevices, statuses) {
    var offlineDays = getNumberInput("offlineDays", 3);
    var checkLicence = hasLicenceField(activeDevices);

    planRows = [];
    dataRows = [];
    communicationRows = [];
    cleanRows = [];

    activeDevices.forEach(function (device) {
      var deviceId = entityId(device);
      var name = preferredDeviceName(device);
      var status = statusByDeviceId[deviceId];

      var serialNumber = device.serialNumber || "";
      var vin = device.vehicleIdentificationNumber || "";
      var plate = getLicencePlate(device);
      var opsGroups = operationalGroups(device.groups || []);
      var opsGroupNames = opsGroups.map(function (g) { return g.name || g.id || "Gruppo"; });

      var missing = [];
      var missingDetails = [];

      if (!hasValue(serialNumber)) {
        missing.push("Seriale dispositivo mancante");
        missingDetails.push("serialNumber vuoto");
      }

      if (!hasValue(vin)) {
        missing.push("VIN mancante");
        missingDetails.push("vehicleIdentificationNumber vuoto");
      }

      if (checkLicence && !hasValue(plate)) {
        missing.push("Targa mancante");
        missingDetails.push("targa/licencePlate vuota");
      }

      if (opsGroups.length === 0) {
        missing.push("Nessun gruppo operativo");
        missingDetails.push("gruppi operativi = 0 dopo esclusione gruppi integrati");
      }

      var communicationProblem = "";
      var communicationPriority = "";
      var communicationEvidence = "";
      var lastDataText = "Non disponibile";

      if (!status) {
        communicationProblem = "Stato dispositivo non disponibile";
        communicationPriority = "Critica";
        communicationEvidence = "Nessun DeviceStatusInfo trovato per questo dispositivo attivo.";
      } else {
        lastDataText = formatDate(status.dateTime);
        var oldDays = daysOld(status.dateTime);

        if (status.isDeviceCommunicating === false) {
          communicationProblem = "Dispositivo non comunicante";
          communicationPriority = "Critica";
          communicationEvidence = "isDeviceCommunicating = false. Ultimo dato: " + lastDataText + (oldDays !== null ? " (" + oldDays + " giorni fa)." : ".");
        } else if (oldDays !== null && oldDays >= offlineDays) {
          communicationProblem = "Ultimo dato troppo vecchio";
          communicationPriority = "Critica";
          communicationEvidence = "Ultimo dato: " + lastDataText + " (" + oldDays + " giorni fa). Soglia: " + offlineDays + " giorni.";
        }
      }

      var needsFix = missing.length > 0 || communicationProblem !== "";

      var planRow = {
        deviceId: deviceId,
        assetName: name,
        serialNumber: serialNumber,
        vin: vin,
        licensePlate: plate,
        operationalGroupNames: opsGroupNames,
        missingLabels: missing,
        missingDetails: missingDetails,
        communicationProblem: communicationProblem,
        communicationPriority: communicationPriority,
        communicationEvidence: communicationEvidence,
        lastDataText: lastDataText,
        needsFix: needsFix,
        evidence: buildPlanEvidence(missingDetails, communicationEvidence),
        action: buildPlanAction(missing, communicationProblem)
      };

      planRows.push(planRow);

      if (missing.length > 0) {
        dataRows.push(planRow);
      }

      if (communicationProblem) {
        communicationRows.push(planRow);
      }

      if (!needsFix) {
        cleanRows.push(planRow);
      }
    });
  }

  function buildPlanEvidence(missingDetails, communicationEvidence) {
    var parts = [];
    if (missingDetails && missingDetails.length) parts.push("Anagrafica: " + missingDetails.join("; ") + ".");
    if (communicationEvidence) parts.push("Comunicazione: " + communicationEvidence);
    if (!parts.length) return "Nessun problema base rilevato.";
    return parts.join(" ");
  }

  function buildPlanAction(missing, communicationProblem) {
    var actions = [];

    if (missing && missing.length) {
      actions.push("completare " + missing.join(", ").toLowerCase());
    }

    if (communicationProblem) {
      actions.push("verificare installazione, alimentazione, copertura e stato dispositivo");
    }

    if (!actions.length) return "Nessuna azione richiesta nei controlli base.";
    return actions.join("; ") + ".";
  }

  function renderSummary() {
    var missingDataCount = planRows.reduce(function (sum, row) { return sum + row.missingLabels.length; }, 0);
    var missingGroupCount = planRows.filter(function (row) { return row.missingLabels.indexOf("Nessun gruppo operativo") !== -1; }).length;
    var assetsToFix = planRows.filter(function (row) { return row.needsFix; }).length;

    setText("assetCount", planRows.length);
    setText("assetsToFixCount", assetsToFix);
    setText("missingDataCount", missingDataCount);
    setText("missingGroupCount", missingGroupCount);
    setText("communicationIssueCount", communicationRows.length);
    setText("cleanAssetCount", cleanRows.length);
  }

  function renderActions() {
    var box = byId("actionList");
    var missingDataCount = planRows.reduce(function (sum, row) { return sum + row.missingLabels.length; }, 0);
    var missingGroupCount = planRows.filter(function (row) { return row.missingLabels.indexOf("Nessun gruppo operativo") !== -1; }).length;
    var missingSerialCount = planRows.filter(function (row) { return row.missingLabels.indexOf("Seriale dispositivo mancante") !== -1; }).length;
    var missingVinCount = planRows.filter(function (row) { return row.missingLabels.indexOf("VIN mancante") !== -1; }).length;
    var communicationCount = communicationRows.length;

    var actions = [];

    if (missingDataCount > 0) {
      actions.push({
        count: missingDataCount,
        title: "Completare dati mancanti",
        text: missingDataCount + " campi da correggere su " + dataRows.length + " asset."
      });
    }

    if (missingGroupCount > 0) {
      actions.push({
        count: missingGroupCount,
        title: "Assegnare gruppi operativi",
        text: "Asset senza gruppo operativo dopo esclusione dei gruppi integrati Geotab."
      });
    }

    if (missingSerialCount > 0 || missingVinCount > 0) {
      actions.push({
        count: missingSerialCount + missingVinCount,
        title: "Pulire anagrafica tecnica",
        text: "Seriali e VIN mancanti possono compromettere manutenzione, riconciliazione e integrazioni."
      });
    }

    if (communicationCount > 0) {
      actions.push({
        count: communicationCount,
        title: "Verificare comunicazione",
        text: "Asset senza stato, non comunicanti o con ultimo dato troppo vecchio."
      });
    }

    box.innerHTML = "";

    if (!actions.length) {
      box.innerHTML = '<div class="empty-state">Nessuna priorità rilevata nei controlli base.</div>';
      return;
    }

    actions.forEach(function (a) {
      var div = document.createElement("div");
      div.className = "action-item";
      div.innerHTML =
        "<div class='action-count'>" + escapeHtml(a.count) + "</div>" +
        "<div><div class='action-title'>" + escapeHtml(a.title) + "</div>" +
        "<div class='action-text'>" + escapeHtml(a.text) + "</div></div>";
      box.appendChild(div);
    });
  }

  function renderPlanTable() {
    var tbody = byId("planTable");
    var query = getSearchText();
    var rows = planRows.slice().filter(function (row) {
      if (showPlanMode === "fix" && !row.needsFix) return false;
      return rowMatches(row, query);
    }).sort(function (a, b) {
      if (a.needsFix !== b.needsFix) return a.needsFix ? -1 : 1;
      return String(a.assetName).localeCompare(String(b.assetName));
    });

    tbody.innerHTML = "";
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">Nessun asset da mostrare.</div></td></tr>';
      return;
    }

    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td><div class='asset-name'>" + escapeHtml(row.assetName) + "</div></td>" +
        "<td>" + statusPills(row) + "</td>" +
        "<td>" + missingPills(row.missingLabels) + "</td>" +
        "<td>" + communicationPill(row) + "</td>" +
        "<td><div class='evidence'>" + escapeHtml(row.evidence) + "</div></td>" +
        "<td><div class='action'>" + escapeHtml(row.action) + "</div></td>" +
        "<td>" + openCell(row) + "</td>";
      tbody.appendChild(tr);
    });
  }

  function renderDataTable() {
    var tbody = byId("dataTable");
    var query = getSearchText();
    var rows = dataRows.slice().filter(function (row) { return rowMatches(row, query); })
      .sort(function (a, b) { return String(a.assetName).localeCompare(String(b.assetName)); });

    tbody.innerHTML = "";
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Nessun dato anagrafico mancante.</div></td></tr>';
      return;
    }

    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td><div class='asset-name'>" + escapeHtml(row.assetName) + "</div></td>" +
        "<td>" + missingPills(row.missingLabels) + "</td>" +
        "<td><div class='evidence'>" + escapeHtml(row.missingDetails.join("; ")) + "</div></td>" +
        "<td><div class='action'>Apri l’asset e completa i campi mancanti indicati.</div></td>" +
        "<td>" + openCell(row) + "</td>";
      tbody.appendChild(tr);
    });
  }

  function renderCommunicationTable() {
    var tbody = byId("communicationTable");
    var query = getSearchText();
    var rows = communicationRows.slice().filter(function (row) { return rowMatches(row, query); })
      .sort(function (a, b) { return String(a.assetName).localeCompare(String(b.assetName)); });

    tbody.innerHTML = "";
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">Nessun problema di comunicazione rilevato.</div></td></tr>';
      return;
    }

    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td><span class='pill critica'>" + escapeHtml(row.communicationPriority || "Critica") + "</span></td>" +
        "<td><div class='asset-name'>" + escapeHtml(row.assetName) + "</div></td>" +
        "<td><div class='problem-title'>" + escapeHtml(row.communicationProblem) + "</div></td>" +
        "<td>" + escapeHtml(row.lastDataText) + "</td>" +
        "<td><div class='evidence'>" + escapeHtml(row.communicationEvidence) + "</div></td>" +
        "<td><div class='action'>Verificare installazione, alimentazione, copertura rete e stato del dispositivo.</div></td>" +
        "<td>" + openCell(row) + "</td>";
      tbody.appendChild(tr);
    });
  }

  function renderCleanTable() {
    var tbody = byId("cleanTable");
    var query = getSearchText();
    var rows = cleanRows.slice().filter(function (row) { return rowMatches(row, query); })
      .sort(function (a, b) { return String(a.assetName).localeCompare(String(b.assetName)); });

    tbody.innerHTML = "";
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">Nessun asset pulito da mostrare con i filtri attuali.</div></td></tr>';
      return;
    }

    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td><div class='asset-name'>" + escapeHtml(row.assetName) + "</div></td>" +
        "<td>" + escapeHtml(row.serialNumber || "-") + "</td>" +
        "<td>" + escapeHtml(row.vin || "-") + "</td>" +
        "<td>" + escapeHtml(row.operationalGroupNames.join(", ") || "-") + "</td>" +
        "<td>" + escapeHtml(row.lastDataText) + "</td>" +
        "<td>" + openCell(row) + "</td>";
      tbody.appendChild(tr);
    });
  }

  function statusPills(row) {
    if (!row.needsFix) return "<span class='pill ok'>OK</span>";

    var pills = [];
    if (row.missingLabels.length) pills.push("<span class='pill media'>Anagrafica</span>");
    if (row.communicationProblem) pills.push("<span class='pill critica'>Comunicazione</span>");
    return pills.join(" ");
  }

  function missingPills(labels) {
    if (!labels || !labels.length) return "<span class='pill ok'>Completa</span>";
    return labels.map(function (label) {
      return "<span class='pill media'>" + escapeHtml(label) + "</span>";
    }).join(" ");
  }

  function communicationPill(row) {
    if (!row.communicationProblem) return "<span class='pill ok'>OK</span>";
    return "<span class='pill critica'>" + escapeHtml(row.communicationProblem) + "</span>";
  }

  function renderAll() {
    renderSummary();
    renderActions();
    renderPlanTable();
    renderDataTable();
    renderCommunicationTable();
    renderCleanTable();
    buildExportRows();
  }

  function buildExportRows() {
    exportRows = [];

    planRows.forEach(function (row) {
      if (row.missingLabels.length) {
        row.missingLabels.forEach(function (missing) {
          exportRows.push({
            categoria: "Anagrafica",
            priorita: "Media",
            asset: row.assetName,
            problema: missing,
            evidenza: row.missingDetails.join("; "),
            azione: "Completare il dato mancante in anagrafica asset.",
            deviceId: row.deviceId,
            seriale: row.serialNumber,
            vin: row.vin,
            targa: row.licensePlate,
            gruppiOperativi: row.operationalGroupNames.join(", "),
            ultimoDato: row.lastDataText
          });
        });
      }

      if (row.communicationProblem) {
        exportRows.push({
          categoria: "Comunicazione",
          priorita: row.communicationPriority || "Critica",
          asset: row.assetName,
          problema: row.communicationProblem,
          evidenza: row.communicationEvidence,
          azione: "Verificare installazione, alimentazione, copertura rete e stato dispositivo.",
          deviceId: row.deviceId,
          seriale: row.serialNumber,
          vin: row.vin,
          targa: row.licensePlate,
          gruppiOperativi: row.operationalGroupNames.join(", "),
          ultimoDato: row.lastDataText
        });
      }
    });
  }

  function getExportColumns() {
    return [
      "Categoria",
      "Priorità",
      "Asset",
      "Problema",
      "Evidenza",
      "Azione consigliata",
      "Device ID",
      "Seriale dispositivo",
      "VIN",
      "Targa",
      "Gruppi operativi",
      "Ultimo dato"
    ];
  }

  function getExportRows() {
    return exportRows.map(function (row) {
      return [
        row.categoria || "",
        row.priorita || "",
        row.asset || "",
        row.problema || "",
        row.evidenza || "",
        row.azione || "",
        row.deviceId || "",
        row.seriale || "",
        row.vin || "",
        row.targa || "",
        row.gruppiOperativi || "",
        row.ultimoDato || ""
      ];
    });
  }

  function exportData() {
    if (!exportRows.length) {
      alert("Nessun dato da esportare. Esegui prima il controllo o verifica che ci siano asset da correggere.");
      return;
    }

    var format = byId("exportFormat").value || "csv";
    if (format === "xlsx") exportXlsx();
    else if (format === "pdf") exportPdf();
    else exportCsv();
  }

  function exportCsv() {
    var header = getExportColumns();
    var rows = getExportRows();
    var lines = [header.map(toCsvValue).join(",")];

    rows.forEach(function (row) {
      lines.push(row.map(toCsvValue).join(","));
    });

    var blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    var stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, "geotab_data_quality_audit_" + stamp + ".csv");
  }

  function toCsvValue(value) {
    var s = String(value === undefined || value === null ? "" : value);
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportXlsx() {
    var header = getExportColumns();
    var rows = getExportRows();
    var stamp = new Date().toISOString().slice(0, 10);

    var worksheetXml = buildWorksheetXml([header].concat(rows));
    var files = {
      "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>',
      "_rels/.rels": '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
      "xl/workbook.xml": '<?xml version="1.0" encoding="UTF-8"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="Audit" sheetId="1" r:id="rId1"/></sheets></workbook>',
      "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>',
      "xl/styles.xml": '<?xml version="1.0" encoding="UTF-8"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
        '<borders count="1"><border/></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
        '</styleSheet>',
      "xl/worksheets/sheet1.xml": worksheetXml
    };

    var blob = new Blob([createZip(files)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    downloadBlob(blob, "geotab_data_quality_audit_" + stamp + ".xlsx");
  }

  function buildWorksheetXml(table) {
    var colWidths = [18, 12, 28, 34, 60, 60, 18, 18, 22, 16, 36, 24];
    var cols = '<cols>' + colWidths.map(function (w, idx) {
      return '<col min="' + (idx + 1) + '" max="' + (idx + 1) + '" width="' + w + '" customWidth="1"/>';
    }).join("") + '</cols>';

    var rowsXml = table.map(function (row, rIdx) {
      var cells = row.map(function (value, cIdx) {
        var ref = columnName(cIdx + 1) + (rIdx + 1);
        var style = rIdx === 0 ? ' s="1"' : '';
        return '<c r="' + ref + '" t="inlineStr"' + style + '><is><t>' + xmlEscape(value) + '</t></is></c>';
      }).join("");
      return '<row r="' + (rIdx + 1) + '">' + cells + '</row>';
    }).join("");

    return '<?xml version="1.0" encoding="UTF-8"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      cols + '<sheetData>' + rowsXml + '</sheetData><autoFilter ref="A1:L' + table.length + '"/></worksheet>';
  }

  function columnName(n) {
    var name = "";
    while (n > 0) {
      var rem = (n - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      n = Math.floor((n - 1) / 26);
    }
    return name;
  }

  function xmlEscape(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function exportPdf() {
    var header = getExportColumns();
    var rows = getExportRows();

    var html = '<!doctype html><html><head><meta charset="utf-8"><title>Geotab Data Quality Audit</title>' +
      '<style>body{font-family:Arial,sans-serif;margin:24px;color:#172033}h1{margin:0 0 6px}p{color:#667085;margin:0 0 18px}' +
      'table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #d8dee9;padding:6px;text-align:left;vertical-align:top}' +
      'th{background:#f2f4f7}@media print{button{display:none}}</style></head><body>' +
      '<h1>Geotab Data Quality Audit</h1><p>Export PDF generato il ' + escapeHtml(new Date().toLocaleString()) + '</p>' +
      '<button onclick="window.print()">Stampa / Salva PDF</button>' +
      '<table><thead><tr>' + header.map(function (h) { return '<th>' + escapeHtml(h) + '</th>'; }).join("") + '</tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr>' + row.map(function (cell) { return '<td>' + escapeHtml(cell) + '</td>'; }).join("") + '</tr>';
      }).join("") +
      '</tbody></table></body></html>';

    var w = window.open("", "_blank");
    if (!w) {
      alert("Popup bloccato dal browser. Consenti i popup per esportare in PDF.");
      return;
    }

    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
  }

  function createZip(files) {
    var encoder = new TextEncoder();
    var fileRecords = [];
    var chunks = [];
    var offset = 0;

    Object.keys(files).forEach(function (name) {
      var nameBytes = encoder.encode(name);
      var dataBytes = encoder.encode(files[name]);
      var crc = crc32(dataBytes);
      var local = new Uint8Array(30 + nameBytes.length);

      writeUint32(local, 0, 0x04034b50);
      writeUint16(local, 4, 20);
      writeUint16(local, 6, 0);
      writeUint16(local, 8, 0);
      writeUint16(local, 10, 0);
      writeUint16(local, 12, 0);
      writeUint32(local, 14, crc);
      writeUint32(local, 18, dataBytes.length);
      writeUint32(local, 22, dataBytes.length);
      writeUint16(local, 26, nameBytes.length);
      writeUint16(local, 28, 0);
      local.set(nameBytes, 30);

      chunks.push(local, dataBytes);
      fileRecords.push({ nameBytes: nameBytes, dataBytes: dataBytes, crc: crc, offset: offset });
      offset += local.length + dataBytes.length;
    });

    var centralStart = offset;

    fileRecords.forEach(function (rec) {
      var central = new Uint8Array(46 + rec.nameBytes.length);

      writeUint32(central, 0, 0x02014b50);
      writeUint16(central, 4, 20);
      writeUint16(central, 6, 20);
      writeUint16(central, 8, 0);
      writeUint16(central, 10, 0);
      writeUint16(central, 12, 0);
      writeUint16(central, 14, 0);
      writeUint32(central, 16, rec.crc);
      writeUint32(central, 20, rec.dataBytes.length);
      writeUint32(central, 24, rec.dataBytes.length);
      writeUint16(central, 28, rec.nameBytes.length);
      writeUint16(central, 30, 0);
      writeUint16(central, 32, 0);
      writeUint16(central, 34, 0);
      writeUint16(central, 36, 0);
      writeUint32(central, 38, 0);
      writeUint32(central, 42, rec.offset);
      central.set(rec.nameBytes, 46);

      chunks.push(central);
      offset += central.length;
    });

    var centralSize = offset - centralStart;
    var end = new Uint8Array(22);
    writeUint32(end, 0, 0x06054b50);
    writeUint16(end, 4, 0);
    writeUint16(end, 6, 0);
    writeUint16(end, 8, fileRecords.length);
    writeUint16(end, 10, fileRecords.length);
    writeUint32(end, 12, centralSize);
    writeUint32(end, 16, centralStart);
    writeUint16(end, 20, 0);
    chunks.push(end);

    var total = chunks.reduce(function (sum, chunk) { return sum + chunk.length; }, 0);
    var out = new Uint8Array(total);
    var pos = 0;
    chunks.forEach(function (chunk) {
      out.set(chunk, pos);
      pos += chunk.length;
    });

    return out;
  }

  function writeUint16(arr, offset, value) {
    arr[offset] = value & 255;
    arr[offset + 1] = (value >>> 8) & 255;
  }

  function writeUint32(arr, offset, value) {
    arr[offset] = value & 255;
    arr[offset + 1] = (value >>> 8) & 255;
    arr[offset + 2] = (value >>> 16) & 255;
    arr[offset + 3] = (value >>> 24) & 255;
  }

  function crc32(bytes) {
    var table = crc32.table || (crc32.table = makeCrcTable());
    var crc = -1;
    for (var i = 0; i < bytes.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  function makeCrcTable() {
    var table = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
      }
      table[n] = c >>> 0;
    }
    return table;
  }

  async function runAudit(api) {
    var runBtn = byId("runAudit");
    var exportBtn = byId("exportBtn");
    runBtn.disabled = true;
    exportBtn.disabled = true;

    byId("status").textContent = "Controllo in corso: lettura Device e DeviceStatusInfo...";

    try {
      var deviceResult = await safeApiGet(api, "Device", {}, 5000);
      var statusResult = await safeApiGet(api, "DeviceStatusInfo", {}, 5000);

      var activeDevices = deviceResult.data.filter(isActiveDevice);
      buildMaps(activeDevices, statusResult.data);
      analyse(activeDevices, statusResult.data);
      renderAll();

      byId("status").textContent =
        "Controllo completato. Asset attivi analizzati: " + planRows.length +
        ". Asset da correggere: " + planRows.filter(function (r) { return r.needsFix; }).length +
        ". Dati da correggere esportabili: " + exportRows.length + ".";

      exportBtn.disabled = exportRows.length === 0;
    } catch (error) {
      console.error("Geotab Data Quality Audit error:", error);
      byId("status").textContent =
        "Errore durante il controllo. Apri la console browser per i dettagli.";
    } finally {
      runBtn.disabled = false;
    }
  }

  function wireTabs() {
    var tabs = document.querySelectorAll(".tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");

        document.querySelectorAll(".tab-panel").forEach(function (panel) {
          panel.classList.remove("active");
        });

        byId("tab-" + tab.getAttribute("data-tab")).classList.add("active");
      });
    });
  }

  function wireOpenButtons() {
    document.body.addEventListener("click", function (event) {
      var target = event.target;
      if (!target) return;

      if (target.classList.contains("js-open-device")) {
        openDevicePage(target.getAttribute("data-device-id"));
      }
    });
  }

  function wireUi(api) {
    wireTabs();
    wireOpenButtons();

    byId("runAudit").addEventListener("click", function () { runAudit(api); });
    byId("exportBtn").addEventListener("click", exportData);
    byId("globalSearch").addEventListener("input", renderAll);

    byId("showOnlyToFix").addEventListener("click", function () {
      showPlanMode = "fix";
      byId("showOnlyToFix").classList.add("active-filter");
      byId("showAllPlan").classList.remove("active-filter");
      renderPlanTable();
    });

    byId("showAllPlan").addEventListener("click", function () {
      showPlanMode = "all";
      byId("showAllPlan").classList.add("active-filter");
      byId("showOnlyToFix").classList.remove("active-filter");
      renderPlanTable();
    });
  }

  if (!window.geotab || !window.geotab.addin) {
    byId("localWarning").className = "notice warning";
  } else {
    window.geotab.addin[ADDIN_NAMESPACE] = function () {
      return {
        initialize: function (api, state, callback) {
          pageState = state;
          wireUi(api);
          if (callback) callback();
        },
        focus: function (api, state) {
          pageState = state;
        },
        blur: function () {}
      };
    };
  }
}());
