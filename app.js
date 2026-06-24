(function () {
  "use strict";

  var ADDIN_NAMESPACE = "geotabauditlite";

  var deviceById = {};
  var ruleById = {};
  var pageState = null;

  var dataRows = [];
  var communicationIssues = [];
  var assetExceptionIssues = [];
  var noisyRuleIssues = [];
  var faultIssues = [];
  var allIssues = [];

  function byId(id) { return document.getElementById(id); }
  function setText(id, value) { byId(id).textContent = value; }

  function jsAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function canUseState() {
    return pageState && typeof pageState.gotoPage === "function";
  }

  function openDevicePage(deviceId) {
    if (!deviceId) {
      alert("ID asset non disponibile per questa riga.");
      return;
    }

    if (canUseState()) {
      pageState.gotoPage("device", { id: deviceId });
      return;
    }

    window.location.hash = "#device,id:" + deviceId;
  }

  function openMapPage(deviceId) {
    if (!deviceId) {
      alert("ID asset non disponibile per questa riga.");
      return;
    }

    if (canUseState()) {
      pageState.gotoPage("map", { liveVehicleIds: "!(" + deviceId + ")" });
      return;
    }

    window.location.hash = "#map,liveVehicleIds:!(" + deviceId + ")";
  }

  function openRulesPage(ruleId) {
    if (canUseState()) {
      pageState.gotoPage("rules", ruleId ? { id: ruleId } : {});
      return;
    }

    window.location.hash = ruleId ? "#rules,id:" + ruleId : "#rules";
  }

  function openFaultsPage() {
    if (canUseState()) {
      pageState.gotoPage("faults");
      return;
    }

    window.location.hash = "#faults";
  }

  function assetCell(issue) {
    return "<div class='object-cell'><span class='object-name'>" + escapeHtml(issue.objectName) + "</span>" +
      (issue.deviceId ? "<button class='row-link js-open-device primary' data-device-id='" + jsAttr(issue.deviceId) + "'>Apri asset</button>" : "") +
      "</div>";
  }

  function openCell(issue) {
    var buttons = [];
    if (issue.deviceId) {
      buttons.push("<button class='row-link js-open-device primary' data-device-id='" + jsAttr(issue.deviceId) + "'>Apri asset</button>");
      buttons.push("<button class='row-link js-open-map' data-device-id='" + jsAttr(issue.deviceId) + "'>Mappa</button>");
    }
    if (issue.ruleId) {
      buttons.push("<button class='row-link js-open-rules' data-rule-id='" + jsAttr(issue.ruleId || "") + "'>Apri regole</button>");
    }
    if (issue.category === "Problemi veicolo") {
      buttons.push("<button class='row-link js-open-faults'>Apri problemi</button>");
    }
    if (!buttons.length) return "<span class='meta'>N/D</span>";
    return "<div class='row-actions'>" + buttons.join("") + "</div>";
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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

  function daysAgoIso(days) {
    return new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();
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

  function deviceNameFromRef(ref) {
    var id = entityId(ref);
    if (id && deviceById[id]) return preferredDeviceName(deviceById[id]);
    if (ref && ref.name) return ref.name;
    if (id) return id;
    return "Dispositivo sconosciuto";
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
    var id = entityId(group);
    var name = normalize(group.name);
    if (group.isSystem || group.system) return true;
    if (/^Group[A-Za-z0-9]+Id$/.test(id)) return true;

    var builtInNames = [
      "company group", "entire organization", "entire organisation",
      "vehicle", "vehicles", "asset", "assets", "trailer", "trailers",
      "driver", "drivers", "azienda", "gruppo azienda", "veicolo", "veicoli",
      "rimorchi", "conducenti"
    ];

    return builtInNames.indexOf(name) !== -1;
  }

  function operationalGroups(groups) {
    if (!groups || !groups.length) return [];
    return groups.filter(function (g) { return !isBuiltInGroup(g); });
  }

  function hasValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
  }

  function hasLicenceField(devices) {
    return devices.some(function (d) {
      return Object.prototype.hasOwnProperty.call(d, "licensePlate") ||
             Object.prototype.hasOwnProperty.call(d, "licencePlate") ||
             Object.prototype.hasOwnProperty.call(d, "licensePlateNumber");
    });
  }

  function getLicencePlate(device) {
    return device.licensePlate || device.licencePlate || device.licensePlateNumber || "";
  }

  function addIssue(list, category, priority, objectName, problem, evidence, action, sortWeight, extra) {
    var issue = {
      category: category,
      priority: priority,
      objectName: objectName,
      problem: problem,
      evidence: evidence,
      action: action,
      sortWeight: sortWeight || 99
    };
    if (extra) {
      Object.keys(extra).forEach(function (key) { issue[key] = extra[key]; });
    }
    list.push(issue);
  }

  function issuePriorityClass(priority) {
    if (priority === "Critica") return "critica";
    if (priority === "Media") return "media";
    return "info";
  }

  function priorityWeight(priority) {
    if (priority === "Critica") return 1;
    if (priority === "Media") return 2;
    return 3;
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

  function buildDeviceMap(activeDevices) {
    deviceById = {};
    activeDevices.forEach(function (device) {
      var id = entityId(device);
      if (id) deviceById[id] = device;
    });
  }

  function buildRuleMap(rules) {
    ruleById = {};
    rules.forEach(function (rule) {
      var id = entityId(rule);
      if (id) ruleById[id] = rule;
    });
  }

  function collectRuleRefsFromEvents(events) {
    var ids = {};
    (events || []).forEach(function (event) {
      var id = entityId(event.rule);
      if (id) ids[id] = true;
      if (event.rule && event.rule.name && id) {
        ruleById[id] = event.rule;
      }
    });
    return Object.keys(ids);
  }

  function collectRuleRefsFromStatuses(statuses) {
    var ids = {};
    (statuses || []).forEach(function (status) {
      (status.exceptionEvents || []).forEach(function (event) {
        var id = entityId(event.rule);
        if (id) ids[id] = true;
        if (event.rule && event.rule.name && id) {
          ruleById[id] = event.rule;
        }
      });
    });
    return Object.keys(ids);
  }

  async function resolveMissingRules(api, statuses, exceptionEvents) {
    var allIds = {};
    collectRuleRefsFromStatuses(statuses).concat(collectRuleRefsFromEvents(exceptionEvents)).forEach(function (id) {
      allIds[id] = true;
    });

    var ids = Object.keys(allIds).filter(function (id) {
      return !ruleById[id] || !ruleById[id].name;
    }).slice(0, 150);

    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];

      // Tentativo 1: EntitySearch con id.
      var result = await safeApiGet(api, "Rule", { id: id }, 1);
      if (result.ok && result.data && result.data.length) {
        ruleById[id] = result.data[0];
        continue;
      }

      // Tentativo 2: alcune istanze accettano un oggetto id.
      var result2 = await safeApiGet(api, "Rule", { id: { id: id } }, 1);
      if (result2.ok && result2.data && result2.data.length) {
        ruleById[id] = result2.data[0];
      }
    }
  }

  function humanizeRuleId(id) {
    if (!id) return "Regola sconosciuta";
    if (/^Rule[A-Za-z0-9]+Id$/.test(id)) {
      var clean = id.replace(/^Rule/, "").replace(/Id$/, "");
      return clean.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
    }
    return "ID regola: " + id;
  }

  function ruleDisplayName(ref) {
    var id = entityId(ref);
    if (ref && ref.name) return ref.name;
    if (id && ruleById[id] && ruleById[id].name) return ruleById[id].name;
    if (id && ruleById[id] && ruleById[id].comment) return ruleById[id].comment;
    return humanizeRuleId(id);
  }

  function analyseDataIssues(activeDevices) {
    dataRows = [];
    var checkLicence = hasLicenceField(activeDevices);

    activeDevices.forEach(function (device) {
      var name = preferredDeviceName(device);
      var missing = [];
      var evidences = [];
      var actions = [];

      if (!hasValue(device.serialNumber)) {
        missing.push("Seriale dispositivo mancante");
        evidences.push("serialNumber vuoto/non disponibile");
        actions.push("verificare seriale dispositivo");
      }

      if (!hasValue(device.vehicleIdentificationNumber)) {
        missing.push("VIN mancante");
        evidences.push("vehicleIdentificationNumber vuoto/non disponibile");
        actions.push("completare VIN");
      }

      if (checkLicence && !hasValue(getLicencePlate(device))) {
        missing.push("Targa mancante");
        evidences.push("campo targa vuoto");
        actions.push("completare targa");
      }

      var opsGroups = operationalGroups(device.groups);
      if (opsGroups.length === 0) {
        var totalGroups = device.groups ? device.groups.length : 0;
        missing.push("Nessun gruppo operativo assegnato");
        evidences.push("gruppi totali: " + totalGroups + ", gruppi operativi: 0 dopo esclusione gruppi integrati");
        actions.push("assegnare gruppo operativo");
      }

      if (missing.length) {
        dataRows.push({
          category: "Anagrafica",
          priority: "Media",
          objectName: name,
          missing: missing,
          problem: missing.join(" + "),
          evidence: evidences.join("; "),
          action: "Correggere: " + actions.join(", ") + ".",
          sortWeight: 10,
          deviceId: entityId(device)
        });
      }
    });
  }

  function analyseCommunicationAndActiveExceptions(activeDevices, statuses) {
    communicationIssues = [];
    assetExceptionIssues = [];

    var offlineDays = getNumberInput("offlineDays", 3);
    var activeExceptionThreshold = getNumberInput("assetExceptionThreshold", 3);

    var statusByDeviceId = {};
    statuses.forEach(function (statusItem) {
      var id = entityId(statusItem.device);
      if (id) statusByDeviceId[id] = statusItem;
    });

    activeDevices.forEach(function (device) {
      var name = preferredDeviceName(device);
      var status = statusByDeviceId[entityId(device)];

      if (!status) {
        addIssue(
          communicationIssues,
          "Comunicazione",
          "Critica",
          name,
          "Stato dispositivo non disponibile",
          "Nessun DeviceStatusInfo trovato per questo dispositivo attivo.",
          "Verificare se l’asset è speciale, se il dispositivo è installato o se l’asset deve essere archiviato.",
          1,
          { deviceId: entityId(device) }
        );
        return;
      }

      var statusName = deviceNameFromRef(status.device);
      var oldDays = daysOld(status.dateTime);
      var dateEvidence = "Ultimo dato: " + formatDate(status.dateTime);
      if (oldDays !== null) dateEvidence += " (" + oldDays + " giorni fa).";

      if (status.isDeviceCommunicating === false) {
        addIssue(
          communicationIssues,
          "Comunicazione",
          "Critica",
          statusName,
          "Dispositivo non comunicante",
          "isDeviceCommunicating = false. " + dateEvidence,
          "Verificare alimentazione, installazione, copertura rete e stato GO device.",
          2,
          { deviceId: entityId(device) }
        );
      } else if (oldDays !== null && oldDays >= offlineDays) {
        addIssue(
          communicationIssues,
          "Comunicazione",
          "Critica",
          statusName,
          "Ultimo dato troppo vecchio",
          dateEvidence,
          "Controllare se il veicolo è fermo, scollegato o se il dispositivo non comunica.",
          3,
          { deviceId: entityId(device) }
        );
      }

      var activeExceptionCount = status.exceptionEvents ? status.exceptionEvents.length : 0;
      if (activeExceptionCount >= activeExceptionThreshold) {
        var ruleNames = [];
        (status.exceptionEvents || []).forEach(function (event) {
          var nameRule = ruleDisplayName(event.rule);
          if (nameRule && ruleNames.indexOf(nameRule) === -1) ruleNames.push(nameRule);
        });

        addIssue(
          assetExceptionIssues,
          "Eccezioni asset",
          "Media",
          statusName,
          "Troppe eccezioni attive sull’asset",
          activeExceptionCount + " eventi attivi",
          "Aprire l’asset e verificare se le eccezioni sono reali o se qualche regola è troppo sensibile.",
          20,
          { ruleNames: ruleNames, deviceId: entityId(device) }
        );
      }
    });
  }

  function ruleIdFromEvent(event) {
    return entityId(event.rule) || ruleDisplayName(event.rule);
  }

  function analyseNoisyRules(exceptionEvents, lookbackDays) {
    noisyRuleIssues = [];
    var threshold = getNumberInput("ruleExceptionThreshold", 20);
    var grouped = {};

    exceptionEvents.forEach(function (event) {
      var key = ruleIdFromEvent(event);
      var ruleName = ruleDisplayName(event.rule);
      var asset = event.device ? deviceNameFromRef(event.device) : "";

      if (!grouped[key]) {
        grouped[key] = {
          ruleName: ruleName,
          count: 0,
          assets: {}
        };
      }

      grouped[key].count += 1;
      if (asset) grouped[key].assets[asset] = true;
    });

    Object.keys(grouped).forEach(function (key) {
      var item = grouped[key];
      var assets = Object.keys(item.assets);

      if (item.count >= threshold) {
        addIssue(
          noisyRuleIssues,
          "Regole rumorose",
          "Media",
          item.ruleName,
          "Regola con troppe exception",
          item.count + " exception negli ultimi " + lookbackDays + " giorni",
          "Verificare soglia, gruppi assegnati, destinatari notifiche e reale utilità della regola.",
          30,
          { assetCount: assets.length, assets: assets }
        );
      }
    });
  }

  function rawText(value) {
    if (value === undefined || value === null) return "";
    if (typeof value === "object") {
      if (value.name) return value.name;
      if (value.id) return entityId(value);
      try { return JSON.stringify(value); } catch (e) { return ""; }
    }
    return String(value);
  }

  function friendlyCamel(value) {
    var s = String(value || "");
    s = s.replace(/Id$/, "");
    s = s.replace(/^Diagnostic/, "");
    s = s.replace(/^Controller/, "");
    return s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
  }

  function firstNonEmpty(values) {
    for (var i = 0; i < values.length; i++) {
      var v = rawText(values[i]);
      if (hasValue(v)) return v;
    }
    return "";
  }

  function collectFaultCodes(fault) {
    var codes = [];

    function add(label, value) {
      var v = rawText(value);
      if (hasValue(v)) codes.push(label + ": " + v);
    }

    add("DTC", fault.dtc || fault.dtcCode || fault.diagnosticTroubleCode);
    add("Codice", fault.code || fault.faultCode || fault.diagnosticCode);
    add("SPN", fault.suspectParameterNumber || fault.spn);
    add("FMI", fault.failureModeIdentifier || fault.fmi);
    add("PGN", fault.parameterGroupNumber || fault.pgn);
    add("SA", fault.sourceAddress);
    add("Class", fault.classCode);

    if (fault.diagnostic) {
      add("Diagnostic code", fault.diagnostic.code || fault.diagnostic.diagnosticCode || fault.diagnostic.sourceCode);
    }

    // Rimuove duplicati identici.
    var unique = [];
    codes.forEach(function (c) {
      if (unique.indexOf(c) === -1) unique.push(c);
    });
    return unique;
  }

  function faultStateText(fault) {
    var raw = firstNonEmpty([fault.state, fault.status, fault.faultState]);
    if (raw) return raw;
    return "Non indicato";
  }

  function faultDiagnosticText(fault) {
    var diagnostic = rawText(fault.diagnostic);
    if (!diagnostic && fault.diagnostic && fault.diagnostic.name) diagnostic = fault.diagnostic.name;
    if (!diagnostic) diagnostic = "Diagnostica non descritta";
    return friendlyCamel(diagnostic);
  }

  function faultControllerText(fault) {
    var controller = rawText(fault.controller);
    return controller ? friendlyCamel(controller) : "";
  }

  function faultFailureModeText(fault) {
    var fm = rawText(fault.failureMode);
    return fm ? friendlyCamel(fm) : "";
  }

  function faultTitle(fault) {
    var codes = collectFaultCodes(fault);
    var diagnostic = faultDiagnosticText(fault);

    if (codes.length) {
      return codes.join(" | ") + " — " + diagnostic;
    }

    return "Codice non disponibile — " + diagnostic;
  }

  function faultSeverity(fault) {
    var raw = [
      fault.severity,
      fault.severityCode,
      fault.faultSeverity,
      fault.diagnostic && fault.diagnostic.severity
    ].map(rawText).join(" ").toLowerCase();

    if (fault.redStopLamp === true) return "Critica";
    if (fault.protectWarningLamp === true) return "Critica";
    if (raw.indexOf("critical") !== -1 || raw.indexOf("high") !== -1 || raw.indexOf("severe") !== -1) return "Critica";
    if (raw.indexOf("3") !== -1 || raw.indexOf("4") !== -1 || raw.indexOf("5") !== -1) return "Critica";

    if (fault.amberWarningLamp === true || fault.malfunctionLamp === true) return "Media";
    if (raw.indexOf("medium") !== -1 || raw.indexOf("moderate") !== -1 || raw.indexOf("warning") !== -1) return "Media";
    if (raw.indexOf("2") !== -1) return "Media";

    return "Informativa";
  }

  function isLikelyActiveFault(fault) {
    var s = faultStateText(fault).toLowerCase();
    if (!s || s === "non indicato") return true;
    return s.indexOf("active") !== -1 || s.indexOf("pending") !== -1 || s.indexOf("fault") !== -1;
  }

  function analyseFaults(faultData, lookbackDays) {
    faultIssues = [];

    faultData.forEach(function (fault) {
      if (!isLikelyActiveFault(fault)) return;

      var asset = fault.device ? deviceNameFromRef(fault.device) : "Asset non indicato";
      var severity = faultSeverity(fault);
      var state = faultStateText(fault);
      var title = faultTitle(fault);
      var controller = faultControllerText(fault);
      var failureMode = faultFailureModeText(fault);

      var evidenceParts = [
        "Data: " + formatDate(fault.dateTime),
        "Periodo: ultimi " + lookbackDays + " giorni"
      ];

      if (controller) evidenceParts.push("Controller: " + controller);
      if (failureMode) evidenceParts.push("Failure mode: " + failureMode);
      if (fault.count !== undefined) evidenceParts.push("Count: " + fault.count);

      addIssue(
        faultIssues,
        "Problemi veicolo",
        severity,
        asset,
        title,
        evidenceParts.join(". "),
        severity === "Critica" ? "Priorità officina: verificare il fault prima possibile." : "Verificare ricorrenza e valutare intervento manutentivo.",
        severity === "Critica" ? 1 : severity === "Media" ? 2 : 3,
        { state: state, deviceId: entityId(fault.device) }
      );
    });
  }

  function sortList(list) {
    return list.sort(function (a, b) {
      if (priorityWeight(a.priority) !== priorityWeight(b.priority)) {
        return priorityWeight(a.priority) - priorityWeight(b.priority);
      }
      if (a.sortWeight !== b.sortWeight) return a.sortWeight - b.sortWeight;
      return String(a.objectName).localeCompare(String(b.objectName));
    });
  }

  function textMatch(issue, query) {
    if (!query) return true;
    var text = [
      issue.category, issue.priority, issue.objectName, issue.problem,
      issue.evidence, issue.action, (issue.missing || []).join(" "),
      (issue.ruleNames || []).join(" "), (issue.assets || []).join(" ")
    ].join(" ").toLowerCase();
    return text.indexOf(query.toLowerCase()) !== -1;
  }

  function renderDataTable() {
    var tbody = byId("dataTable");
    var query = byId("dataSearch").value.trim();
    var rows = dataRows.slice().filter(function (i) { return textMatch(i, query); })
      .sort(function (a, b) { return String(a.objectName).localeCompare(String(b.objectName)); });

    tbody.innerHTML = "";
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Nessun asset da mostrare.</div></td></tr>';
      return;
    }

    rows.forEach(function (i) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + assetCell(i) + "</td>" +
        "<td>" + i.missing.map(function (m) { return "<span class='pill media'>" + escapeHtml(m) + "</span>"; }).join(" ") + "</td>" +
        "<td><div class='evidence'>" + escapeHtml(i.evidence) + "</div></td>" +
        "<td><div class='action'>" + escapeHtml(i.action) + "</div></td>" +
        "<td>" + openCell(i) + "</td>";
      tbody.appendChild(tr);
    });
  }

  function renderIssueTable(tbodyId, list, searchId, columns) {
    var tbody = byId(tbodyId);
    var query = searchId ? byId(searchId).value.trim() : "";
    var rows = sortList(list.slice()).filter(function (i) { return textMatch(i, query); });

    tbody.innerHTML = "";
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="' + columns + '"><div class="empty-state">Nessun elemento da mostrare.</div></td></tr>';
      return;
    }

    rows.forEach(function (i) {
      var tr = document.createElement("tr");

      if (tbodyId === "communicationTable") {
        tr.innerHTML =
          "<td><span class='pill " + issuePriorityClass(i.priority) + "'>" + escapeHtml(i.priority) + "</span></td>" +
          "<td>" + assetCell(i) + "</td>" +
          "<td><div class='problem-title'>" + escapeHtml(i.problem) + "</div></td>" +
          "<td><div class='evidence'>" + escapeHtml(i.evidence) + "</div></td>" +
          "<td><div class='action'>" + escapeHtml(i.action) + "</div></td>" +
          "<td>" + openCell(i) + "</td>";
      } else if (tbodyId === "assetExceptionTable") {
        tr.innerHTML =
          "<td>" + assetCell(i) + "</td>" +
          "<td><span class='pill media'>" + escapeHtml(i.evidence) + "</span></td>" +
          "<td><div class='evidence'>" + escapeHtml((i.ruleNames || []).join(", ")) + "</div></td>" +
          "<td><div class='action'>" + escapeHtml(i.action) + "</div></td>" +
          "<td>" + openCell(i) + "</td>";
      } else if (tbodyId === "ruleTable") {
        tr.innerHTML =
          "<td><div class='problem-title'>" + escapeHtml(i.objectName) + "</div></td>" +
          "<td><span class='pill media'>" + escapeHtml(String(i.exceptionCount || "")) + "</span></td>" +
          "<td><div class='evidence'>" + escapeHtml((i.assetCount || 0) + " asset: " + (i.assets || []).slice(0, 8).join(", ")) + "</div></td>" +
          "<td><div class='action'>" + escapeHtml(i.action) + "</div></td>" +
          "<td>" + openCell(i) + "</td>";
      } else if (tbodyId === "faultTable") {
        tr.innerHTML =
          "<td><span class='pill " + issuePriorityClass(i.priority) + "'>" + escapeHtml(i.priority) + "</span></td>" +
          "<td>" + assetCell(i) + "</td>" +
          "<td><div class='problem-title'>" + escapeHtml(i.problem) + "</div></td>" +
          "<td>" + escapeHtml(i.state || "Non indicato") + "</td>" +
          "<td><div class='evidence'>" + escapeHtml(i.evidence) + "</div></td>" +
          "<td><div class='action'>" + escapeHtml(i.action) + "</div></td>" +
          "<td>" + openCell(i) + "</td>";
      } else {
        tr.innerHTML =
          "<td>" + escapeHtml(i.category) + "</td>" +
          "<td><span class='pill " + issuePriorityClass(i.priority) + "'>" + escapeHtml(i.priority) + "</span></td>" +
          "<td>" + assetCell(i) + "</td>" +
          "<td><div class='problem-title'>" + escapeHtml(i.problem) + "</div></td>" +
          "<td><div class='evidence'>" + escapeHtml(i.evidence) + "</div></td>" +
          "<td><div class='action'>" + escapeHtml(i.action) + "</div></td>" +
          "<td>" + openCell(i) + "</td>";
      }

      tbody.appendChild(tr);
    });
  }

  function renderActions() {
    var box = byId("actionList");

    var totalDataFields = dataRows.reduce(function (sum, row) { return sum + row.missing.length; }, 0);
    var actions = [
      {
        count: totalDataFields,
        title: "Correggere anagrafiche",
        text: totalDataFields + " dati da correggere su " + dataRows.length + " asset."
      },
      {
        count: communicationIssues.length,
        title: "Verificare comunicazione",
        text: "Asset senza stato, non comunicanti o con dati troppo vecchi."
      },
      {
        count: assetExceptionIssues.length,
        title: "Controllare asset con troppe eccezioni",
        text: "Asset con molte eccezioni attive nello stato corrente."
      },
      {
        count: noisyRuleIssues.length,
        title: "Rivedere regole rumorose",
        text: "Regole che generano molte exception nel periodo selezionato."
      },
      {
        count: faultIssues.length,
        title: "Gestire problemi veicolo",
        text: "Fault attivi/recenti letti dai dati diagnostici MyGeotab."
      }
    ].filter(function (a) { return a.count > 0; });

    box.innerHTML = "";
    if (!actions.length) {
      box.innerHTML = '<div class="empty-state">Nessuna priorità rilevata nei controlli attuali.</div>';
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

  function flattenDataRows() {
    var rows = [];
    dataRows.forEach(function (row) {
      row.missing.forEach(function (missing) {
        rows.push({
          category: "Anagrafica",
          priority: "Media",
          objectName: row.objectName,
          problem: missing,
          evidence: row.evidence,
          action: row.action,
          deviceId: row.deviceId
        });
      });
    });
    return rows;
  }

  function renderAllTables() {
    var flatData = flattenDataRows();
    allIssues = [].concat(flatData, communicationIssues, assetExceptionIssues, noisyRuleIssues, faultIssues);

    var totalDataFields = flatData.length;
    setText("dataIssueCount", totalDataFields);
    setText("dataIssueHelp", totalDataFields + " dati su " + dataRows.length + " asset");
    setText("commIssueCount", communicationIssues.length);
    setText("commIssueHelp", uniqueObjectCount(communicationIssues) + " asset");
    setText("assetExceptionCount", assetExceptionIssues.length);
    setText("assetExceptionHelp", uniqueObjectCount(assetExceptionIssues) + " asset");
    setText("noisyRuleCount", noisyRuleIssues.length);
    setText("faultIssueCount", faultIssues.length);
    setText("faultIssueHelp", uniqueObjectCount(faultIssues) + " asset");

    renderActions();
    renderDataTable();
    renderIssueTable("communicationTable", communicationIssues, "communicationSearch", 6);
    renderIssueTable("assetExceptionTable", assetExceptionIssues, "assetExceptionSearch", 5);
    renderIssueTable("ruleTable", noisyRuleIssues, "ruleSearch", 5);
    renderIssueTable("faultTable", faultIssues, "faultSearch", 7);
    renderIssueTable("allTable", allIssues, "allSearch", 7);
  }

  function uniqueObjectCount(list) {
    var map = {};
    list.forEach(function (i) { map[i.objectName] = true; });
    return Object.keys(map).length;
  }

  function exportCsv() {
    var header = ["Categoria", "Priorità", "Asset/Oggetto", "Problema", "Evidenza", "Azione"];
    var lines = [header.map(toCsvValue).join(",")];

    allIssues.forEach(function (i) {
      lines.push([i.category, i.priority, i.objectName, i.problem, i.evidence, i.action].map(toCsvValue).join(","));
    });

    var blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    var stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = "geotab_audit_lite_" + stamp + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function toCsvValue(value) {
    var s = String(value === undefined || value === null ? "" : value);
    return '"' + s.replace(/"/g, '""') + '"';
  }

  async function loadFaultData(api, fromDate, toDate) {
    var activeResult = await safeApiGet(api, "FaultData", { fromDate: fromDate, toDate: toDate, state: "Active" }, 5000);
    if (activeResult.ok) return activeResult.data;
    var fallback = await safeApiGet(api, "FaultData", { fromDate: fromDate, toDate: toDate }, 5000);
    return fallback.data;
  }

  async function runAudit(api) {
    var runBtn = byId("runAudit");
    var exportBtn = byId("exportCsv");
    runBtn.disabled = true;
    exportBtn.disabled = true;

    dataRows = [];
    communicationIssues = [];
    assetExceptionIssues = [];
    noisyRuleIssues = [];
    faultIssues = [];
    allIssues = [];

    byId("status").textContent = "Controllo in corso: lettura Device, DeviceStatusInfo, Rule, ExceptionEvent e FaultData...";

    try {
      var lookbackDays = getNumberInput("lookbackDays", 7);
      var fromDate = daysAgoIso(lookbackDays);
      var toDate = new Date().toISOString();

      var deviceResult = await safeApiGet(api, "Device", {}, 5000);
      var statusResult = await safeApiGet(api, "DeviceStatusInfo", {}, 5000);
      var ruleResult = await safeApiGet(api, "Rule", {}, 5000);

      var activeDevices = deviceResult.data.filter(isActiveDevice);
      buildDeviceMap(activeDevices);
      buildRuleMap(ruleResult.data);

      var exceptionResult = await safeApiGet(api, "ExceptionEvent", { fromDate: fromDate, toDate: toDate }, 5000);
      await resolveMissingRules(api, statusResult.data, exceptionResult.data);

      analyseDataIssues(activeDevices);
      analyseCommunicationAndActiveExceptions(activeDevices, statusResult.data);

      setText("assetCount", activeDevices.length);

      if (exceptionResult.ok) {
        analyseNoisyRules(exceptionResult.data, lookbackDays);
      } else {
        addIssue(noisyRuleIssues, "Regole rumorose", "Informativa", "ExceptionEvent", "Dati exception non disponibili", "Non è stato possibile leggere ExceptionEvent nel periodo selezionato.", "Verificare permessi utente o riprovare con un periodo più breve.", 99);
      }

      var faultData = await loadFaultData(api, fromDate, toDate);
      analyseFaults(faultData, lookbackDays);

      renderAllTables();

      byId("status").textContent =
        "Controllo completato. Asset attivi: " + activeDevices.length +
        ". Regole lette: " + ruleResult.data.length +
        ". ExceptionEvent periodo: " + exceptionResult.data.length +
        ". FaultData periodo: " + faultData.length + ".";

      exportBtn.disabled = allIssues.length === 0;
    } catch (error) {
      console.error("Geotab Audit Lite error:", error);
      byId("status").textContent = "Errore durante il controllo. Apri la console browser per i dettagli.";
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

  function wireSearches() {
    [
      ["dataSearch", renderDataTable],
      ["communicationSearch", function () { renderIssueTable("communicationTable", communicationIssues, "communicationSearch", 6); }],
      ["assetExceptionSearch", function () { renderIssueTable("assetExceptionTable", assetExceptionIssues, "assetExceptionSearch", 5); }],
      ["ruleSearch", function () { renderIssueTable("ruleTable", noisyRuleIssues, "ruleSearch", 5); }],
      ["faultSearch", function () { renderIssueTable("faultTable", faultIssues, "faultSearch", 7); }],
      ["allSearch", function () { renderIssueTable("allTable", allIssues, "allSearch", 7); }]
    ].forEach(function (item) {
      byId(item[0]).addEventListener("input", item[1]);
    });
  }

  function wireOpenButtons() {
    document.body.addEventListener("click", function (event) {
      var target = event.target;
      if (!target) return;

      if (target.classList.contains("js-open-device")) {
        openDevicePage(target.getAttribute("data-device-id"));
      } else if (target.classList.contains("js-open-map")) {
        openMapPage(target.getAttribute("data-device-id"));
      } else if (target.classList.contains("js-open-rules")) {
        openRulesPage(target.getAttribute("data-rule-id"));
      } else if (target.classList.contains("js-open-faults")) {
        openFaultsPage();
      }
    });
  }

  function wireUi(api) {
    wireTabs();
    wireSearches();
    wireOpenButtons();

    byId("runAudit").addEventListener("click", function () { runAudit(api); });
    byId("exportCsv").addEventListener("click", exportCsv);
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
