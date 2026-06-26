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
  var inactiveRows = [];
  var exportRows = [];
  var showPlanMode = "fix";
  var refreshTimer = null;
  var currentLanguage = "it";
  var lastApi = null;

  var I18N = {
    it: {
      appTitle: "Vodafone Automotive Quality Audit",
      subtitle: "Controllo qualità della banca dati: asset da correggere, dati mancanti, gruppi operativi, comunicazione dispositivi e dispositivi non installati.",
      localWarning: "Questa pagina è aperta fuori da MyGeotab. Per leggere i dati reali deve essere caricata come Add-In dentro MyGeotab.",
      refreshNow: "Aggiorna ora",
      exportFormat: "Formato export",
      exportPlan: "Esporta piano correzione",
      searchAsset: "Cerca asset",
      searchPlaceholder: "nome asset, VIN, seriale...",
      searchHelp: "filtra le tabelle",
      ready: "Pronto. Il controllo parte automaticamente all’apertura.",
      loading: "Aggiornamento in corso: lettura Device e DeviceStatusInfo...",
      done: "Controllo aggiornato.",
      error: "Errore durante il controllo. Apri la console browser per i dettagli.",
      assetAnalysed: "Asset attivi analizzati",
      activeDevices: "Dispositivi attivi",
      assetsToFix: "Asset da correggere",
      withProblems: "Con almeno un problema",
      missingData: "Dati mancanti",
      missingDataHelp: "VIN, seriale, targa, gruppi",
      missingGroup: "Senza gruppo operativo",
      missingGroupHelp: "Esclusi gruppi integrati",
      communicationIssues: "Problemi comunicazione",
      communicationHelp: "Non comunicanti",
      inactiveDevices: "Non installati",
      inactiveHelp: "Senza DeviceStatusInfo",
      cleanAssets: "Asset puliti",
      cleanHelp: "Nessun problema base",
      prioritiesTitle: "Priorità operative",
      prioritiesText: "Vista cliente finale: cosa sistemare prima per rendere affidabili report, regole e dashboard MyGeotab.",
      emptyPriorities: "Nessuna priorità rilevata nei controlli base.",
      tabPlan: "Piano correzione",
      tabData: "Anagrafica",
      tabCommunication: "Comunicazione",
      tabInactive: "Non installati",
      tabClean: "Asset puliti",
      planTitle: "Piano correzione asset",
      planText: "Solo asset con DeviceStatusInfo. I dispositivi non installati sono esclusi dal piano correzione e dall’anagrafica.",
      onlyFix: "Solo da correggere",
      allAssets: "Tutti gli asset attivi",
      dataTitle: "Asset attivi con dati anagrafici mancanti",
      dataText: "VIN, seriale dispositivo, targa e gruppi operativi. I dispositivi non installati sono esclusi.",
      commTitle: "Asset attivi con problemi di comunicazione",
      commText: "Dispositivi attivi con DeviceStatusInfo ma non comunicanti.",
      inactiveTitle: "Dispositivi non installati",
      inactiveText: "Elenco separato: questi asset non hanno DeviceStatusInfo e sono considerati non installati ai fini dell’audit.",
      cleanTitle: "Asset attivi senza problemi base rilevati",
      cleanText: "Asset attivi con anagrafica minima completa, gruppo operativo e comunicazione regolare.",
      thAsset: "Asset", thStatus: "Stato", thMissing: "Dati mancanti", thCommunication: "Comunicazione", thEvidence: "Evidenza", thAction: "Azione consigliata", thOpen: "Apri", thPriority: "Priorità", thProblem: "Problema", thLastData: "Ultimo dato", thSerial: "Seriale", thVin: "VIN", thGroups: "Gruppi operativi", thReason: "Motivo",
      openAsset: "Apri asset", notAvailable: "N/D", unavailable: "Non disponibile", ok: "OK", complete: "Completa", critical: "Critica", medium: "Media", registry: "Anagrafica", communication: "Comunicazione",
      noRows: "Nessun asset da mostrare.", noDataRows: "Nessun dato anagrafico mancante sugli asset attivi.", noCommRows: "Nessun problema di comunicazione rilevato sugli asset attivi.", noInactiveRows: "Nessun dispositivo non installato rilevato.", noCleanRows: "Nessun asset pulito da mostrare con i filtri attuali.",
      missingSerial: "Seriale dispositivo mancante", missingVin: "VIN mancante", missingPlate: "Targa mancante", noOpsGroup: "Nessun gruppo operativo", statusMissing: "Stato dispositivo non disponibile", notCommunicating: "Dispositivo non comunicante", oldData: "Ultimo dato troppo vecchio", notInstalled: "Dispositivo non installato", inactivePeriod: "Dispositivo fuori periodo di attività",
      serialEmpty: "serialNumber vuoto", vinEmpty: "vehicleIdentificationNumber vuoto", plateEmpty: "targa/licencePlate vuota", opsEmpty: "gruppi operativi = 0 dopo esclusione gruppi integrati", noStatusEvidence: "Nessun DeviceStatusInfo trovato per questo dispositivo attivo.", oldThreshold: "Soglia", daysAgo: "giorni fa", oldDataLabel: "Dato vecchio",
      fixMissing: "Completare dati mancanti", fixMissingText: "campi da correggere su", assignGroups: "Assegnare gruppi operativi", assignGroupsText: "Asset attivi senza gruppo operativo dopo esclusione dei gruppi integrati Geotab.", cleanRegistry: "Pulire anagrafica tecnica", cleanRegistryText: "Seriali e VIN mancanti possono compromettere manutenzione, riconciliazione e integrazioni.", verifyCommunication: "Verificare comunicazione", verifyCommunicationText: "Asset attivi con DeviceStatusInfo ma non comunicanti.", reviewInactive: "Verificare dispositivi non installati", reviewInactiveText: "Asset senza DeviceStatusInfo, separati dal piano correzione.",
      actionComplete: "Apri l’asset e completa i campi mancanti indicati.", actionComm: "Verificare installazione, alimentazione, copertura rete e stato del dispositivo.", noAction: "Nessuna azione richiesta nei controlli base.", noBaseProblem: "Nessun problema base rilevato.", noExport: "Nessun dato da esportare. Verifica che ci siano asset attivi da correggere.", popupBlocked: "Popup bloccato dal browser. Consenti i popup per esportare in PDF.", footer: "Add-in in sola lettura. Usa l’utente già loggato. Non salva credenziali e non usa backend.",
      exportGenerated: "Export PDF generato il", printPdf: "Stampa / Salva PDF",
      colCategory: "Categoria", colPriority: "Priorità", colAsset: "Asset", colProblem: "Problema", colEvidence: "Evidenza", colAction: "Azione consigliata", colDeviceId: "Device ID", colSerial: "Seriale dispositivo", colPlate: "Targa", colOps: "Gruppi operativi", colLast: "Ultimo dato"
    },
    en: {
      appTitle: "Vodafone Automotive Quality Audit",
      subtitle: "Database quality check: assets to fix, missing data, operational groups, device communication and not installed devices.",
      localWarning: "This page is open outside MyGeotab. To read real data it must be loaded as an Add-In inside MyGeotab.",
      refreshNow: "Refresh now", exportFormat: "Export format", exportPlan: "Export fix plan", searchAsset: "Search assets", searchPlaceholder: "asset name, VIN, serial...", searchHelp: "filters tables", ready: "Ready. The audit runs automatically when opened.", loading: "Refreshing: reading Device and DeviceStatusInfo...", done: "Audit updated.", error: "Error during audit. Open the browser console for details.",
      assetAnalysed: "Active assets analysed", activeDevices: "Active devices", assetsToFix: "Assets to fix", withProblems: "With at least one issue", missingData: "Missing data", missingDataHelp: "VIN, serial, plate, groups", missingGroup: "Without operational group", missingGroupHelp: "Built-in groups excluded", communicationIssues: "Communication issues", communicationHelp: "Not communicating", inactiveDevices: "Not installed", inactiveHelp: "Device status unavailable", cleanAssets: "Clean assets", cleanHelp: "No basic issue",
      prioritiesTitle: "Operational priorities", prioritiesText: "Customer view: what to fix first to make MyGeotab reports, rules and dashboards reliable.", emptyPriorities: "No priority detected in the basic checks.", tabPlan: "Fix plan", tabData: "Registry", tabCommunication: "Communication", tabInactive: "Not installed", tabClean: "Clean assets", planTitle: "Asset fix plan", planText: "Assets with DeviceStatusInfo only. Not installed devices are excluded from the fix plan and registry checks.", onlyFix: "Only to fix", allAssets: "All active assets", dataTitle: "Active assets with missing registry data", dataText: "VIN, device serial, plate and operational groups. Not installed devices are excluded.", commTitle: "Active assets with communication issues", commText: "Active devices with DeviceStatusInfo but not communicating.", inactiveTitle: "Not installed devices", inactiveText: "Separate list: these assets have no DeviceStatusInfo and are considered not installed for audit purposes.", cleanTitle: "Active assets with no basic issue", cleanText: "Active assets with minimum registry data, operational group and regular communication.",
      thAsset: "Asset", thStatus: "Status", thMissing: "Missing data", thCommunication: "Communication", thEvidence: "Evidence", thAction: "Recommended action", thOpen: "Open", thPriority: "Priority", thProblem: "Issue", thLastData: "Last data", thSerial: "Serial", thVin: "VIN", thGroups: "Operational groups", thReason: "Reason",
      openAsset: "Open asset", notAvailable: "N/A", unavailable: "Unavailable", ok: "OK", complete: "Complete", critical: "Critical", medium: "Medium", registry: "Registry", communication: "Communication", noRows: "No asset to display.", noDataRows: "No missing registry data on active assets.", noCommRows: "No communication issue detected on active assets.", noInactiveRows: "No not installed device detected.", noCleanRows: "No clean asset to display with current filters.",
      missingSerial: "Missing device serial", missingVin: "Missing VIN", missingPlate: "Missing plate", noOpsGroup: "No operational group", statusMissing: "Device status unavailable", notCommunicating: "Device not communicating", oldData: "Last data too old", notInstalled: "Device not installed", inactivePeriod: "Device outside active period", serialEmpty: "serialNumber empty", vinEmpty: "vehicleIdentificationNumber empty", plateEmpty: "plate/licencePlate empty", opsEmpty: "operational groups = 0 after excluding built-in groups", noStatusEvidence: "No DeviceStatusInfo found for this active device.", oldThreshold: "Threshold", daysAgo: "days ago", oldDataLabel: "Old data",
      fixMissing: "Complete missing data", fixMissingText: "fields to fix on", assignGroups: "Assign operational groups", assignGroupsText: "Active assets without operational group after excluding Geotab built-in groups.", cleanRegistry: "Clean technical registry", cleanRegistryText: "Missing serials and VINs may impact maintenance, reconciliation and integrations.", verifyCommunication: "Check communication", verifyCommunicationText: "Active assets with DeviceStatusInfo but not communicating.", reviewInactive: "Check not installed devices", reviewInactiveText: "Assets without DeviceStatusInfo, separated from the fix plan.",
      actionComplete: "Open the asset and complete the listed missing fields.", actionComm: "Check installation, power, network coverage and device status.", noAction: "No action required for the basic checks.", noBaseProblem: "No basic issue detected.", noExport: "No data to export. Check if there are active assets to fix.", popupBlocked: "Popup blocked by the browser. Allow popups to export to PDF.", footer: "Read-only add-in. Uses the user already logged in. It does not store credentials and does not use a backend.", exportGenerated: "PDF export generated on", printPdf: "Print / Save PDF",
      colCategory: "Category", colPriority: "Priority", colAsset: "Asset", colProblem: "Issue", colEvidence: "Evidence", colAction: "Recommended action", colDeviceId: "Device ID", colSerial: "Device serial", colPlate: "Plate", colOps: "Operational groups", colLast: "Last data"
    }
  };

  function t(key) {
    var lang = I18N[currentLanguage] ? currentLanguage : "en";
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  }

  function languageFromValue(value) {
    if (!value) return null;
    var v = String(value).toLowerCase();
    if (v.indexOf("ital") !== -1 || v === "it" || v.indexOf("it-") === 0 || v.indexOf("it_") === 0) return "it";
    if (v.indexOf("engl") !== -1 || v === "en" || v.indexOf("en-") === 0 || v.indexOf("en_") === 0) return "en";
    return null;
  }

  function detectLanguage(state) {
    var candidates = [];

    function add(value) {
      if (value !== undefined && value !== null) candidates.push(value);
    }

    function scan(obj, depth) {
      if (!obj || depth > 3) return;
      try {
        ["language", "lang", "culture", "userCulture", "locale", "uiCulture", "displayLanguage", "preferredLanguage"].forEach(function (k) { add(obj[k]); });
        ["user", "currentUser", "session", "profile", "database", "options"].forEach(function (k) { if (obj[k]) scan(obj[k], depth + 1); });
      } catch (e) {}
    }

    scan(state, 0);

    // Prefer MyGeotab/profile values. Use browser language only as fallback.
    for (var i = 0; i < candidates.length; i++) {
      var found = languageFromValue(candidates[i]);
      if (found) { currentLanguage = found; return; }
    }

    currentLanguage = languageFromValue(navigator.language) || languageFromValue(navigator.userLanguage) || "en";
  }

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

  function buildMaps(devices, statuses) {
    deviceById = {};
    devices.forEach(function (device) {
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
      alert(t("notAvailable"));
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
      alert(t("openAsset"));
    }
  }

  function openCell(row) {
    if (!row.deviceId) return "<span class='meta'>" + escapeHtml(t("notAvailable")) + "</span>";
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
      row.inactiveReason,
      row.evidence,
      row.action,
      row.operationalGroupNames && row.operationalGroupNames.join(" ")
    ].join(" ").toLowerCase();

    return text.indexOf(query) !== -1;
  }

  function analyse(allDevices, statuses) {
    var activeDevices = allDevices.filter(isActiveDevice);
    var checkLicence = hasLicenceField(activeDevices);

    planRows = [];
    dataRows = [];
    communicationRows = [];
    cleanRows = [];
    inactiveRows = [];

    activeDevices.forEach(function (device) {
      var deviceId = entityId(device);
      var status = statusByDeviceId[deviceId];

      // Regola prodotto:
      // - device con DeviceStatusInfo: controlliamo anagrafica;
      // - device con DeviceStatusInfo e non comunicante: anagrafica + problema comunicazione;
      // - device senza DeviceStatusInfo: task separato "non installati", fuori da piano correzione/anagrafica.
      if (!status) {
        inactiveRows.push(buildInactiveRow(device, t("statusMissing")));
        return;
      }

      var name = preferredDeviceName(device);

      var serialNumber = device.serialNumber || "";
      var vin = device.vehicleIdentificationNumber || "";
      var plate = getLicencePlate(device);
      var opsGroups = operationalGroups(device.groups || []);
      var opsGroupNames = opsGroups.map(function (g) { return g.name || g.id || "Group"; });

      var missing = [];
      var missingDetails = [];

      if (!hasValue(serialNumber)) {
        missing.push(t("missingSerial"));
        missingDetails.push(t("serialEmpty"));
      }

      if (!hasValue(vin)) {
        missing.push(t("missingVin"));
        missingDetails.push(t("vinEmpty"));
      }

      if (checkLicence && !hasValue(plate)) {
        missing.push(t("missingPlate"));
        missingDetails.push(t("plateEmpty"));
      }

      if (opsGroups.length === 0) {
        missing.push(t("noOpsGroup"));
        missingDetails.push(t("opsEmpty"));
      }

      var communicationProblem = "";
      var communicationPriority = "";
      var communicationEvidence = "";
      var lastDataText = t("unavailable");

      lastDataText = formatDate(status.dateTime);
      var oldDays = daysOld(status.dateTime);

      if (status.isDeviceCommunicating === false) {
        communicationProblem = t("notCommunicating");
        communicationPriority = t("critical");
        communicationEvidence = "isDeviceCommunicating = false. " + t("thLastData") + ": " + lastDataText + (oldDays !== null ? " (" + oldDays + " " + t("daysAgo") + ")." : ".");
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

      if (missing.length > 0) dataRows.push(planRow);
      if (communicationProblem) communicationRows.push(planRow);
      if (!needsFix) cleanRows.push(planRow);
    });
  }

  function buildInactiveRow(device, reasonOverride) {
    var id = entityId(device);
    var reason = reasonOverride || t("statusMissing");

    return {
      deviceId: id,
      assetName: preferredDeviceName(device),
      serialNumber: device.serialNumber || "",
      vin: device.vehicleIdentificationNumber || "",
      licensePlate: getLicencePlate(device),
      operationalGroupNames: operationalGroups(device.groups || []).map(function (g) { return g.name || g.id || "Group"; }),
      inactiveReason: reason,
      lastDataText: t("unavailable")
    };
  }

  function buildPlanEvidence(missingDetails, communicationEvidence) {
    var parts = [];
    if (missingDetails && missingDetails.length) parts.push(t("registry") + ": " + missingDetails.join("; ") + ".");
    if (communicationEvidence) parts.push(t("communication") + ": " + communicationEvidence);
    if (!parts.length) return t("noBaseProblem");
    return parts.join(" ");
  }

  function buildPlanAction(missing, communicationProblem) {
    var actions = [];

    if (missing && missing.length) {
      actions.push(t("actionComplete"));
    }

    if (communicationProblem) {
      actions.push(t("actionComm"));
    }

    if (!actions.length) return t("noAction");
    return actions.join("; ") + ".";
  }

  function renderSummary() {
    var missingDataCount = planRows.reduce(function (sum, row) { return sum + row.missingLabels.length; }, 0);
    var missingGroupCount = planRows.filter(function (row) { return row.missingLabels.indexOf(t("noOpsGroup")) !== -1; }).length;
    var assetsToFix = planRows.filter(function (row) { return row.needsFix; }).length;

    setText("assetCount", planRows.length);
    setText("assetsToFixCount", assetsToFix);
    setText("missingDataCount", missingDataCount);
    setText("missingGroupCount", missingGroupCount);
    setText("communicationIssueCount", communicationRows.length);
    setText("inactiveDeviceCount", inactiveRows.length);
    setText("cleanAssetCount", cleanRows.length);
  }

  function renderActions() {
    var box = byId("actionList");
    var missingDataCount = planRows.reduce(function (sum, row) { return sum + row.missingLabels.length; }, 0);
    var missingGroupCount = planRows.filter(function (row) { return row.missingLabels.indexOf(t("noOpsGroup")) !== -1; }).length;
    var missingSerialCount = planRows.filter(function (row) { return row.missingLabels.indexOf(t("missingSerial")) !== -1; }).length;
    var missingVinCount = planRows.filter(function (row) { return row.missingLabels.indexOf(t("missingVin")) !== -1; }).length;
    var communicationCount = communicationRows.length;

    var actions = [];

    if (missingDataCount > 0) actions.push({ count: missingDataCount, title: t("fixMissing"), text: missingDataCount + " " + t("fixMissingText") + " " + dataRows.length + " asset." });
    if (missingGroupCount > 0) actions.push({ count: missingGroupCount, title: t("assignGroups"), text: t("assignGroupsText") });
    if (missingSerialCount > 0 || missingVinCount > 0) actions.push({ count: missingSerialCount + missingVinCount, title: t("cleanRegistry"), text: t("cleanRegistryText") });
    if (communicationCount > 0) actions.push({ count: communicationCount, title: t("verifyCommunication"), text: t("verifyCommunicationText") });
    if (inactiveRows.length > 0) actions.push({ count: inactiveRows.length, title: t("reviewInactive"), text: t("reviewInactiveText") });

    box.innerHTML = "";
    if (!actions.length) {
      box.innerHTML = '<div class="empty-state">' + escapeHtml(t("emptyPriorities")) + '</div>';
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
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">' + escapeHtml(t("noRows")) + '</div></td></tr>';
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
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">' + escapeHtml(t("noDataRows")) + '</div></td></tr>';
      return;
    }

    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td><div class='asset-name'>" + escapeHtml(row.assetName) + "</div></td>" +
        "<td>" + missingPills(row.missingLabels) + "</td>" +
        "<td><div class='evidence'>" + escapeHtml(row.missingDetails.join("; ")) + "</div></td>" +
        "<td><div class='action'>" + escapeHtml(t("actionComplete")) + "</div></td>" +
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
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">' + escapeHtml(t("noCommRows")) + '</div></td></tr>';
      return;
    }

    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td><span class='pill critica'>" + escapeHtml(row.communicationPriority || t("critical")) + "</span></td>" +
        "<td><div class='asset-name'>" + escapeHtml(row.assetName) + "</div></td>" +
        "<td><div class='problem-title'>" + escapeHtml(row.communicationProblem) + "</div></td>" +
        "<td>" + escapeHtml(row.lastDataText) + "</td>" +
        "<td><div class='evidence'>" + escapeHtml(row.communicationEvidence) + "</div></td>" +
        "<td><div class='action'>" + escapeHtml(t("actionComm")) + "</div></td>" +
        "<td>" + openCell(row) + "</td>";
      tbody.appendChild(tr);
    });
  }

  function renderInactiveTable() {
    var tbody = byId("inactiveTable");
    var query = getSearchText();
    if (!tbody) return;
    var rows = inactiveRows.slice().filter(function (row) { return rowMatches(row, query); })
      .sort(function (a, b) { return String(a.assetName).localeCompare(String(b.assetName)); });

    tbody.innerHTML = "";
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">' + escapeHtml(t("noInactiveRows")) + '</div></td></tr>';
      return;
    }

    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td><div class='asset-name'>" + escapeHtml(row.assetName) + "</div></td>" +
        "<td>" + escapeHtml(row.inactiveReason || "-") + "</td>" +
        "<td>" + escapeHtml(row.serialNumber || "-") + "</td>" +
        "<td>" + escapeHtml(row.vin || "-") + "</td>" +
        "<td>" + escapeHtml(row.licensePlate || "-") + "</td>" +
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
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">' + escapeHtml(t("noCleanRows")) + '</div></td></tr>';
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
    if (!row.needsFix) return "<span class='pill ok'>" + escapeHtml(t("ok")) + "</span>";

    var pills = [];
    if (row.missingLabels.length) pills.push("<span class='pill media'>" + escapeHtml(t("registry")) + "</span>");
    if (row.communicationProblem) pills.push("<span class='pill critica'>" + escapeHtml(t("communication")) + "</span>");
    return pills.join(" ");
  }

  function missingPills(labels) {
    if (!labels || !labels.length) return "<span class='pill ok'>" + escapeHtml(t("complete")) + "</span>";
    return labels.map(function (label) {
      return "<span class='pill media'>" + escapeHtml(label) + "</span>";
    }).join(" ");
  }

  function communicationPill(row) {
    if (!row.communicationProblem) return "<span class='pill ok'>" + escapeHtml(t("ok")) + "</span>";
    return "<span class='pill critica'>" + escapeHtml(row.communicationProblem) + "</span>";
  }

  function renderAll() {
    renderSummary();
    renderActions();
    renderPlanTable();
    renderDataTable();
    renderCommunicationTable();
    renderInactiveTable();
    renderCleanTable();
    buildExportRows();
  }

  function buildExportRows() {
    exportRows = [];

    planRows.forEach(function (row) {
      if (row.missingLabels.length) {
        row.missingLabels.forEach(function (missing) {
          exportRows.push({
            categoria: t("registry"),
            priorita: t("medium"),
            asset: row.assetName,
            problema: missing,
            evidenza: row.missingDetails.join("; "),
            azione: t("actionComplete"),
            deviceId: row.deviceId,
            seriale: row.serialNumber,
            vin: row.vin,
            targa: row.licensePlate,
            gruppiOperativi: row.operationalGroupNames.join(" | "),
            ultimoDato: row.lastDataText
          });
        });
      }

      if (row.communicationProblem) {
        exportRows.push({
          categoria: t("communication"),
          priorita: row.communicationPriority || t("critical"),
          asset: row.assetName,
          problema: row.communicationProblem,
          evidenza: row.communicationEvidence,
          azione: t("actionComm"),
          deviceId: row.deviceId,
          seriale: row.serialNumber,
          vin: row.vin,
          targa: row.licensePlate,
          gruppiOperativi: row.operationalGroupNames.join(" | "),
          ultimoDato: row.lastDataText
        });
      }
    });
  }

  function getExportColumns() {
    return [
      t("colCategory"),
      t("colPriority"),
      t("colAsset"),
      t("colProblem"),
      t("colEvidence"),
      t("colAction"),
      t("colDeviceId"),
      t("colSerial"),
      t("thVin"),
      t("colPlate"),
      t("colOps"),
      t("colLast")
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
      alert(t("noExport"));
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

    var blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    var stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, "geotab_data_quality_audit_" + stamp + ".csv");
  }

  function toCsvValue(value) {
    var s = String(value === undefined || value === null ? "" : value);
    // The CSV uses comma as separator. Remove commas inside field values so Excel/Text-to-columns
    // cannot split evidence/date text into extra columns when quotes are ignored by the local import flow.
    s = s.replace(/,/g, ";").replace(/\r?\n/g, " ");
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

    var html = '<!doctype html><html><head><meta charset="utf-8"><title>Vodafone Automotive Quality Audit</title>' +
      '<style>body{font-family:Arial,sans-serif;margin:24px;color:#172033}h1{margin:0 0 6px}p{color:#667085;margin:0 0 18px}' +
      'table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #d8dee9;padding:6px;text-align:left;vertical-align:top}' +
      'th{background:#f2f4f7}@media print{button{display:none}}</style></head><body>' +
      '<h1>' + escapeHtml(t("appTitle")) + '</h1><p>' + escapeHtml(t("exportGenerated")) + ' ' + escapeHtml(new Date().toLocaleString()) + '</p>' +
      '<button onclick="window.print()">' + escapeHtml(t("printPdf")) + '</button>' +
      '<table><thead><tr>' + header.map(function (h) { return '<th>' + escapeHtml(h) + '</th>'; }).join("") + '</tr></thead><tbody>' +
      rows.map(function (row) {
        return '<tr>' + row.map(function (cell) { return '<td>' + escapeHtml(cell) + '</td>'; }).join("") + '</tr>';
      }).join("") +
      '</tbody></table></body></html>';

    var w = window.open("", "_blank");
    if (!w) {
      alert(t("popupBlocked"));
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
    var refreshBtn = byId("refreshAudit");
    var exportBtn = byId("exportBtn");
    lastApi = api || lastApi;
    if (!lastApi) return;

    if (refreshBtn) refreshBtn.disabled = true;
    if (exportBtn) exportBtn.disabled = true;
    byId("status").textContent = t("loading");

    try {
      var deviceResult = await safeApiGet(lastApi, "Device", {}, 5000);
      var statusResult = await safeApiGet(lastApi, "DeviceStatusInfo", {}, 5000);

      buildMaps(deviceResult.data, statusResult.data);
      analyse(deviceResult.data, statusResult.data);
      renderAll();
      applyTranslations();

      byId("status").innerHTML =
        escapeHtml(t("done")) + " " +
        escapeHtml(t("assetAnalysed")) + ": " + planRows.length +
        ". " + escapeHtml(t("assetsToFix")) + ": " + planRows.filter(function (r) { return r.needsFix; }).length +
        ". " + escapeHtml(t("inactiveDevices")) + ": " + inactiveRows.length + ".";

      exportBtn.disabled = exportRows.length === 0;
    } catch (error) {
      console.error("Vodafone Automotive Quality Audit error:", error);
      byId("status").textContent = t("error");
    } finally {
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  function scheduleAutoRefresh(api) {
    lastApi = api || lastApi;
    if (refreshTimer) window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(function () {
      if (lastApi && !document.hidden) runAudit(lastApi);
    }, 5 * 60 * 1000);
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

    byId("refreshAudit").addEventListener("click", function () { runAudit(api); });
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

  function applyTranslations() {
    var map = {
      appTitle: "appTitle", subtitle: "subtitle", localWarning: "localWarning", refreshAudit: "refreshNow",
      exportFormatLabel: "exportFormat", exportBtn: "exportPlan", searchLabel: "searchAsset", searchHelp: "searchHelp",
      assetLabel: "assetAnalysed", assetHelp: "activeDevices", fixLabel: "assetsToFix", fixHelp: "withProblems",
      missingDataLabel: "missingData", missingDataHelpText: "missingDataHelp", missingGroupLabel: "missingGroup", missingGroupHelpText: "missingGroupHelp",
      communicationLabel: "communicationIssues", communicationHelpText: "communicationHelp", inactiveLabel: "inactiveDevices", inactiveHelpText: "inactiveHelp", cleanLabel: "cleanAssets", cleanHelpText: "cleanHelp",
      prioritiesTitle: "prioritiesTitle", prioritiesText: "prioritiesText", tabPlanBtn: "tabPlan", tabDataBtn: "tabData", tabCommunicationBtn: "tabCommunication", tabInactiveBtn: "tabInactive", tabCleanBtn: "tabClean",
      planTitle: "planTitle", planText: "planText", showOnlyToFix: "onlyFix", showAllPlan: "allAssets", dataTitle: "dataTitle", dataText: "dataText", commTitle: "commTitle", commText: "commText", inactiveTitle: "inactiveTitle", inactiveText: "inactiveText", cleanTitle: "cleanTitle", cleanText: "cleanText", footerText: "footer"
    };
    Object.keys(map).forEach(function (id) {
      var el = byId(id);
      if (el) el.textContent = t(map[id]);
    });
    var search = byId("globalSearch");
    if (search) search.setAttribute("placeholder", t("searchPlaceholder"));
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    if (byId("status") && byId("status").textContent.indexOf("Pronto") !== -1) byId("status").textContent = t("ready");
  }

  if (!window.geotab || !window.geotab.addin) {
    detectLanguage(null);
    applyTranslations();
    byId("localWarning").className = "notice warning";
  } else {
    window.geotab.addin[ADDIN_NAMESPACE] = function () {
      return {
        initialize: function (api, state, callback) {
          pageState = state;
          detectLanguage(state);
          applyTranslations();
          wireUi(api);
          scheduleAutoRefresh(api);
          runAudit(api);
          if (callback) callback();
        },
        focus: function (api, state) {
          pageState = state;
          detectLanguage(state);
          applyTranslations();
          runAudit(api);
        },
        blur: function () {}
      };
    };
  }
}());
