(function () {
  "use strict";

  var ADDIN_NAMESPACE = "geotabauditlite";
  var deviceById = {};
  var ruleById = {};
  var dataIssues = [], communicationIssues = [], assetExceptionIssues = [], noisyRuleIssues = [], faultIssues = [], allIssues = [];

  function byId(id) { return document.getElementById(id); }
  function setText(id, value) { byId(id).textContent = value; }
  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function safeDate(value) { if (!value) return null; var d = new Date(value); return isNaN(d.getTime()) ? null : d; }
  function formatDate(value) { var d = safeDate(value); if (!d) return "Non disponibile"; try { return d.toLocaleString(); } catch(e) { return String(value); } }
  function daysOld(dateValue) { var d = safeDate(dateValue); if (!d) return null; return Math.floor((Date.now() - d.getTime()) / 86400000); }
  function daysAgoIso(days) { return new Date(Date.now() - (days * 86400000)).toISOString(); }
  function getNumberInput(id, fallback) { var v = parseInt(byId(id).value, 10); return (isNaN(v) || v < 1) ? fallback : v; }
  function preferredDeviceName(device) {
    if (!device) return "";
    if (device.name) return device.name;
    if (device.serialNumber) return device.serialNumber;
    if (device.vehicleIdentificationNumber) return device.vehicleIdentificationNumber;
    if (device.id) return device.id;
    return "";
  }
  function deviceNameFromRef(ref) {
    var id = ref && ref.id ? ref.id : "";
    if (id && deviceById[id]) return preferredDeviceName(deviceById[id]);
    if (ref && ref.name) return ref.name;
    if (id) return id;
    return "Dispositivo sconosciuto";
  }
  function isActiveDevice(device) {
    if (!device || device.id === "NoDeviceId") return false;
    var now = new Date(), from = safeDate(device.activeFrom), to = safeDate(device.activeTo);
    if (from && from > now) return false;
    if (to && to < now) return false;
    return true;
  }
  function normalize(value) { return String(value || "").trim().toLowerCase(); }
  function isBuiltInGroup(group) {
    if (!group) return true;
    var id = String(group.id || ""), name = normalize(group.name);
    if (group.isSystem || group.system) return true;
    if (/^Group[A-Za-z0-9]+Id$/.test(id)) return true;
    var builtInNames = ["company group","entire organization","entire organisation","vehicle","vehicles","asset","assets","trailer","trailers","driver","drivers","azienda","gruppo azienda","veicolo","veicoli","rimorchi","conducenti"];
    return builtInNames.indexOf(name) !== -1;
  }
  function operationalGroups(groups) { return (groups || []).filter(function (g) { return !isBuiltInGroup(g); }); }
  function hasValue(value) { return value !== undefined && value !== null && String(value).trim() !== ""; }
  function hasLicenceField(devices) { return devices.some(function (d) { return Object.prototype.hasOwnProperty.call(d, "licensePlate") || Object.prototype.hasOwnProperty.call(d, "licencePlate"); }); }
  function getLicencePlate(device) { return device.licensePlate || device.licencePlate || ""; }

  function addIssue(list, category, priority, objectName, problem, evidence, action, sortWeight) {
    list.push({ category: category, priority: priority, objectName: objectName, problem: problem, evidence: evidence, action: action, sortWeight: sortWeight || 99 });
  }
  function issuePriorityClass(priority) { return priority === "Critica" ? "critica" : priority === "Media" ? "media" : "info"; }
  function priorityWeight(priority) { return priority === "Critica" ? 1 : priority === "Media" ? 2 : 3; }

  function apiGet(api, typeName, search, resultsLimit) {
    return new Promise(function (resolve, reject) {
      api.call("Get", { typeName: typeName, search: search || {}, resultsLimit: resultsLimit || 5000 }, function (result) { resolve(result || []); }, reject);
    });
  }
  async function safeApiGet(api, typeName, search, resultsLimit) {
    try { return { ok: true, data: await apiGet(api, typeName, search, resultsLimit), error: null }; }
    catch (e) { console.error("Errore lettura " + typeName, e); return { ok: false, data: [], error: e }; }
  }

  function buildMaps(activeDevices, rules) {
    deviceById = {}; activeDevices.forEach(function (d) { if (d && d.id) deviceById[d.id] = d; });
    ruleById = {}; (rules || []).forEach(function (r) { if (r && r.id) ruleById[r.id] = r; });
  }

  function analyseDataIssues(activeDevices) {
    dataIssues = [];
    var checkLicence = hasLicenceField(activeDevices);
    activeDevices.forEach(function (device) {
      var name = preferredDeviceName(device);
      if (!hasValue(device.serialNumber)) addIssue(dataIssues, "Anagrafica", "Media", name, "Seriale dispositivo mancante", "Campo Device.serialNumber vuoto o non disponibile.", "Completare o verificare l’anagrafica dispositivo.", 10);
      if (!hasValue(device.vehicleIdentificationNumber)) addIssue(dataIssues, "Anagrafica", "Media", name, "VIN mancante", "Campo Device.vehicleIdentificationNumber vuoto o non disponibile.", "Completare il VIN se usato per manutenzione, integrazioni o riconciliazione dati.", 11);
      if (checkLicence && !hasValue(getLicencePlate(device))) addIssue(dataIssues, "Anagrafica", "Media", name, "Targa mancante", "Campo targa/licencePlate vuoto.", "Completare la targa se disponibile nella tua configurazione MyGeotab.", 12);
      var opsGroups = operationalGroups(device.groups);
      if (opsGroups.length === 0) {
        var totalGroups = device.groups ? device.groups.length : 0;
        addIssue(dataIssues, "Anagrafica", "Media", name, "Nessun gruppo operativo assegnato", "Gruppi totali: " + totalGroups + ". Gruppi operativi dopo esclusione gruppi integrati Geotab: 0.", "Assegnare l’asset al gruppo operativo corretto, ad esempio sede, cliente, reparto o flotta.", 13);
      }
    });
  }

  function analyseCommunicationAndActiveExceptions(activeDevices, statuses) {
    communicationIssues = []; assetExceptionIssues = [];
    var offlineDays = getNumberInput("offlineDays", 3), activeExceptionThreshold = getNumberInput("assetExceptionThreshold", 3);
    var statusByDeviceId = {};
    (statuses || []).forEach(function (s) { var id = s.device && s.device.id ? s.device.id : ""; if (id) statusByDeviceId[id] = s; });

    activeDevices.forEach(function (device) {
      var name = preferredDeviceName(device), status = statusByDeviceId[device.id];
      if (!status) {
        addIssue(communicationIssues, "Comunicazione", "Critica", name, "Stato dispositivo non disponibile", "Nessun DeviceStatusInfo trovato per questo dispositivo attivo.", "Verificare se l’asset è speciale, se il dispositivo è installato o se l’asset deve essere archiviato.", 1);
        return;
      }
      var statusName = deviceNameFromRef(status.device), oldDays = daysOld(status.dateTime);
      var dateEvidence = "Ultimo dato: " + formatDate(status.dateTime) + (oldDays !== null ? " (" + oldDays + " giorni fa)." : ".");
      if (status.isDeviceCommunicating === false) {
        addIssue(communicationIssues, "Comunicazione", "Critica", statusName, "Dispositivo non comunicante", "DeviceStatusInfo.isDeviceCommunicating = false. " + dateEvidence, "Verificare alimentazione, installazione, copertura rete e stato GO device.", 2);
      } else if (oldDays !== null && oldDays >= offlineDays) {
        addIssue(communicationIssues, "Comunicazione", "Critica", statusName, "Ultimo dato troppo vecchio", dateEvidence, "Controllare se il veicolo è fermo, scollegato o se il dispositivo non comunica.", 3);
      }

      var activeExceptionCount = status.exceptionEvents ? status.exceptionEvents.length : 0;
      if (activeExceptionCount >= activeExceptionThreshold) {
        var ruleNames = [];
        (status.exceptionEvents || []).forEach(function (event) {
          var ruleName = "";
          if (event.rule && event.rule.name) ruleName = event.rule.name;
          else if (event.rule && event.rule.id && ruleById[event.rule.id]) ruleName = ruleById[event.rule.id].name;
          else if (event.rule && event.rule.id) ruleName = event.rule.id;
          if (ruleName && ruleNames.indexOf(ruleName) === -1) ruleNames.push(ruleName);
        });
        addIssue(assetExceptionIssues, "Eccezioni asset", "Media", statusName, "Troppe eccezioni attive sull’asset", activeExceptionCount + " eventi attivi. " + (ruleNames.length ? "Regole: " + ruleNames.slice(0, 5).join(", ") : "Dettaglio regole non disponibile nello stato."), "Aprire l’asset e verificare se le eccezioni sono reali o se qualche regola è troppo sensibile.", 20);
      }
    });
  }

  function ruleNameFromEvent(event) {
    if (event.rule && event.rule.name) return event.rule.name;
    var id = event.rule && event.rule.id ? event.rule.id : "";
    if (id && ruleById[id] && ruleById[id].name) return ruleById[id].name;
    return id || "Regola sconosciuta";
  }
  function ruleIdFromEvent(event) { return event.rule && event.rule.id ? event.rule.id : ruleNameFromEvent(event); }

  function analyseNoisyRules(exceptionEvents, lookbackDays) {
    noisyRuleIssues = [];
    var threshold = getNumberInput("ruleExceptionThreshold", 20), grouped = {};
    (exceptionEvents || []).forEach(function (event) {
      var key = ruleIdFromEvent(event), name = ruleNameFromEvent(event), asset = event.device ? deviceNameFromRef(event.device) : "";
      if (!grouped[key]) grouped[key] = { ruleName: name, count: 0, assets: {} };
      grouped[key].count += 1;
      if (asset) grouped[key].assets[asset] = true;
    });
    Object.keys(grouped).forEach(function (key) {
      var item = grouped[key], assetCount = Object.keys(item.assets).length;
      if (item.count >= threshold) {
        addIssue(noisyRuleIssues, "Regole rumorose", "Media", item.ruleName, "Regola con troppe exception", item.count + " exception negli ultimi " + lookbackDays + " giorni su " + assetCount + " asset.", "Verificare soglia, gruppi assegnati, destinatari notifiche e reale utilità della regola.", 30);
      }
    });
  }

  function faultStateText(fault) {
    var raw = fault.state || fault.status || fault.faultState || "";
    if (typeof raw === "object") return raw.name || raw.id || JSON.stringify(raw);
    return raw ? String(raw) : "Non indicato";
  }
  function faultCodeText(fault) {
    var parts = [];
    if (fault.diagnostic) parts.push(fault.diagnostic.name || fault.diagnostic.id || "");
    if (fault.classCode) parts.push("Class: " + fault.classCode);
    if (fault.controller) parts.push("Controller: " + (fault.controller.name || fault.controller.id || ""));
    if (fault.failureMode) parts.push("Failure mode: " + (fault.failureMode.name || fault.failureMode.id || ""));
    return parts.filter(Boolean).join(" | ") || fault.id || "Fault non descritto";
  }
  function faultSeverity(fault) {
    var raw = [fault.severity, fault.severityCode, fault.faultSeverity, fault.diagnostic && fault.diagnostic.severity].map(function (x) {
      if (x === undefined || x === null) return "";
      return typeof x === "object" ? JSON.stringify(x) : String(x);
    }).join(" ").toLowerCase();
    if (fault.redStopLamp === true || fault.protectWarningLamp === true || raw.indexOf("critical") !== -1 || raw.indexOf("high") !== -1 || raw.indexOf("severe") !== -1 || raw.indexOf("3") !== -1 || raw.indexOf("4") !== -1 || raw.indexOf("5") !== -1) return "Critica";
    if (fault.amberWarningLamp === true || fault.malfunctionLamp === true || raw.indexOf("medium") !== -1 || raw.indexOf("moderate") !== -1 || raw.indexOf("warning") !== -1 || raw.indexOf("2") !== -1) return "Media";
    return "Informativa";
  }
  function isLikelyActiveFault(fault) {
    var s = faultStateText(fault).toLowerCase();
    if (!s || s === "non indicato") return true;
    return s.indexOf("active") !== -1 || s.indexOf("pending") !== -1 || s.indexOf("fault") !== -1;
  }
  function analyseFaults(faultData, lookbackDays) {
    faultIssues = [];
    (faultData || []).forEach(function (fault) {
      if (!isLikelyActiveFault(fault)) return;
      var asset = fault.device ? deviceNameFromRef(fault.device) : "Asset non indicato";
      var severity = faultSeverity(fault), state = faultStateText(fault), code = faultCodeText(fault), date = formatDate(fault.dateTime), count = fault.count !== undefined ? fault.count : "";
      addIssue(faultIssues, "Problemi veicolo", severity, asset, code, "Stato: " + state + ". Data: " + date + (count !== "" ? ". Count: " + count + "." : "") + " Periodo analizzato: ultimi " + lookbackDays + " giorni.", severity === "Critica" ? "Priorità officina: verificare il fault prima possibile." : "Verificare ricorrenza e valutare intervento manutentivo.", severity === "Critica" ? 1 : severity === "Media" ? 2 : 3);
    });
  }

  function sortList(list) {
    return list.sort(function (a, b) {
      if (priorityWeight(a.priority) !== priorityWeight(b.priority)) return priorityWeight(a.priority) - priorityWeight(b.priority);
      if (a.sortWeight !== b.sortWeight) return a.sortWeight - b.sortWeight;
      return String(a.objectName).localeCompare(String(b.objectName));
    });
  }
  function textMatch(issue, query) {
    if (!query) return true;
    var text = [issue.category, issue.priority, issue.objectName, issue.problem, issue.evidence, issue.action].join(" ").toLowerCase();
    return text.indexOf(query.toLowerCase()) !== -1;
  }
  function extractState(evidence) { var m = String(evidence || "").match(/Stato:\\s*([^\\.]+)/); return m ? m[1] : "Non indicato"; }

  function renderSimpleTable(tbodyId, list, searchId, columns) {
    var tbody = byId(tbodyId), query = searchId ? byId(searchId).value.trim() : "";
    var rows = sortList(list.slice()).filter(function (i) { return textMatch(i, query); });
    tbody.innerHTML = "";
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="' + columns + '"><div class="empty-state">Nessun elemento da mostrare.</div></td></tr>'; return; }
    rows.forEach(function (i) {
      var tr = document.createElement("tr");
      if (tbodyId === "dataTable") tr.innerHTML = "<td>" + escapeHtml(i.objectName) + "</td><td><div class='problem-title'>" + escapeHtml(i.problem) + "</div></td><td><div class='evidence'>" + escapeHtml(i.evidence) + "</div></td><td><div class='action'>" + escapeHtml(i.action) + "</div></td>";
      else if (tbodyId === "communicationTable") tr.innerHTML = "<td><span class='pill " + issuePriorityClass(i.priority) + "'>" + escapeHtml(i.priority) + "</span></td><td>" + escapeHtml(i.objectName) + "</td><td><div class='problem-title'>" + escapeHtml(i.problem) + "</div></td><td><div class='evidence'>" + escapeHtml(i.evidence) + "</div></td><td><div class='action'>" + escapeHtml(i.action) + "</div></td>";
      else if (tbodyId === "assetExceptionTable") tr.innerHTML = "<td>" + escapeHtml(i.objectName) + "</td><td><span class='pill media'>" + escapeHtml(i.problem) + "</span></td><td><div class='evidence'>" + escapeHtml(i.evidence) + "</div></td><td><div class='action'>" + escapeHtml(i.action) + "</div></td>";
      else if (tbodyId === "ruleTable") {
        var m = i.evidence.match(/^\\d+/), count = m ? m[0] : "";
        tr.innerHTML = "<td><div class='problem-title'>" + escapeHtml(i.objectName) + "</div></td><td><span class='pill media'>" + escapeHtml(count) + "</span></td><td><div class='evidence'>" + escapeHtml(i.evidence) + "</div></td><td><div class='action'>" + escapeHtml(i.action) + "</div></td>";
      }
      else if (tbodyId === "faultTable") tr.innerHTML = "<td><span class='pill " + issuePriorityClass(i.priority) + "'>" + escapeHtml(i.priority) + "</span></td><td>" + escapeHtml(i.objectName) + "</td><td><div class='problem-title'>" + escapeHtml(i.problem) + "</div></td><td>" + escapeHtml(extractState(i.evidence)) + "</td><td><div class='evidence'>" + escapeHtml(i.evidence) + "</div></td><td><div class='action'>" + escapeHtml(i.action) + "</div></td>";
      else tr.innerHTML = "<td>" + escapeHtml(i.category) + "</td><td><span class='pill " + issuePriorityClass(i.priority) + "'>" + escapeHtml(i.priority) + "</span></td><td>" + escapeHtml(i.objectName) + "</td><td><div class='problem-title'>" + escapeHtml(i.problem) + "</div></td><td><div class='evidence'>" + escapeHtml(i.evidence) + "</div></td><td><div class='action'>" + escapeHtml(i.action) + "</div></td>";
      tbody.appendChild(tr);
    });
  }

  function renderActions() {
    var box = byId("actionList");
    var actions = [
      { count: dataIssues.length, title: "Correggere dati anagrafici", text: "VIN, seriali e gruppi operativi mancanti. Sono correzioni da fare in MyGeotab prima di fidarsi dei report." },
      { count: communicationIssues.length, title: "Verificare comunicazione", text: "Asset senza stato, non comunicanti o con dati troppo vecchi. Priorità tecnica/installativa." },
      { count: assetExceptionIssues.length, title: "Controllare asset con troppe eccezioni", text: "Questi asset hanno molte eccezioni attive nello stato corrente." },
      { count: noisyRuleIssues.length, title: "Rivedere regole rumorose", text: "Regole che generano molte exception nel periodo: verificare soglie, gruppi e notifiche." },
      { count: faultIssues.length, title: "Gestire problemi veicolo", text: "Fault attivi/recenti letti dai dati diagnostici MyGeotab." }
    ].filter(function (a) { return a.count > 0; });
    box.innerHTML = "";
    if (!actions.length) { box.innerHTML = '<div class="empty-state">Nessuna priorità rilevata nei controlli attuali.</div>'; return; }
    actions.forEach(function (a) {
      var div = document.createElement("div"); div.className = "action-item";
      div.innerHTML = "<div class='action-count'>" + escapeHtml(a.count) + "</div><div><div class='action-title'>" + escapeHtml(a.title) + "</div><div class='action-text'>" + escapeHtml(a.text) + "</div></div>";
      box.appendChild(div);
    });
  }

  function renderAllTables() {
    allIssues = [].concat(dataIssues, communicationIssues, assetExceptionIssues, noisyRuleIssues, faultIssues);
    setText("dataIssueCount", dataIssues.length); setText("commIssueCount", communicationIssues.length);
    setText("assetExceptionCount", assetExceptionIssues.length); setText("noisyRuleCount", noisyRuleIssues.length); setText("faultIssueCount", faultIssues.length);
    renderActions();
    renderSimpleTable("dataTable", dataIssues, "dataSearch", 4);
    renderSimpleTable("communicationTable", communicationIssues, "communicationSearch", 5);
    renderSimpleTable("assetExceptionTable", assetExceptionIssues, "assetExceptionSearch", 4);
    renderSimpleTable("ruleTable", noisyRuleIssues, "ruleSearch", 4);
    renderSimpleTable("faultTable", faultIssues, "faultSearch", 6);
    renderSimpleTable("allTable", allIssues, "allSearch", 6);
  }

  function toCsvValue(value) { var s = String(value === undefined || value === null ? "" : value); return '"' + s.replace(/"/g, '""') + '"'; }
  function exportCsv() {
    var header = ["Categoria", "Priorità", "Asset/Oggetto", "Problema", "Evidenza", "Azione"];
    var lines = [header.map(toCsvValue).join(",")];
    allIssues.forEach(function (i) { lines.push([i.category, i.priority, i.objectName, i.problem, i.evidence, i.action].map(toCsvValue).join(",")); });
    var blob = new Blob([lines.join("\\n")], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob), a = document.createElement("a"), stamp = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = "geotab_audit_lite_" + stamp + ".csv"; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  async function loadFaultData(api, fromDate, toDate) {
    var activeResult = await safeApiGet(api, "FaultData", { fromDate: fromDate, toDate: toDate, state: "Active" }, 5000);
    if (activeResult.ok) return activeResult.data;
    var fallback = await safeApiGet(api, "FaultData", { fromDate: fromDate, toDate: toDate }, 5000);
    return fallback.data;
  }

  async function runAudit(api) {
    var runBtn = byId("runAudit"), exportBtn = byId("exportCsv");
    runBtn.disabled = true; exportBtn.disabled = true;
    dataIssues = []; communicationIssues = []; assetExceptionIssues = []; noisyRuleIssues = []; faultIssues = []; allIssues = [];
    byId("status").textContent = "Controllo in corso: lettura Device, DeviceStatusInfo, Rule, ExceptionEvent e FaultData...";
    try {
      var lookbackDays = getNumberInput("lookbackDays", 7), fromDate = daysAgoIso(lookbackDays), toDate = new Date().toISOString();
      var deviceResult = await safeApiGet(api, "Device", {}, 5000);
      var statusResult = await safeApiGet(api, "DeviceStatusInfo", {}, 5000);
      var ruleResult = await safeApiGet(api, "Rule", {}, 5000);
      var activeDevices = deviceResult.data.filter(isActiveDevice);
      buildMaps(activeDevices, ruleResult.data);
      analyseDataIssues(activeDevices);
      analyseCommunicationAndActiveExceptions(activeDevices, statusResult.data);
      setText("assetCount", activeDevices.length);

      var exceptionResult = await safeApiGet(api, "ExceptionEvent", { fromDate: fromDate, toDate: toDate }, 5000);
      if (exceptionResult.ok) analyseNoisyRules(exceptionResult.data, lookbackDays);
      else addIssue(noisyRuleIssues, "Regole rumorose", "Informativa", "ExceptionEvent", "Dati exception non disponibili", "Non è stato possibile leggere ExceptionEvent nel periodo selezionato.", "Verificare permessi utente o riprovare con un periodo più breve.", 99);

      var faultData = await loadFaultData(api, fromDate, toDate);
      analyseFaults(faultData, lookbackDays);

      renderAllTables();
      byId("status").textContent = "Controllo completato. Asset attivi: " + activeDevices.length + ". DeviceStatusInfo letti: " + statusResult.data.length + ". Regole lette: " + ruleResult.data.length + ". ExceptionEvent periodo: " + exceptionResult.data.length + ". FaultData periodo: " + faultData.length + ".";
      exportBtn.disabled = allIssues.length === 0;
    } catch (error) {
      console.error("Geotab Audit Lite error:", error);
      byId("status").textContent = "Errore durante il controllo. Apri la console browser per i dettagli.";
    } finally {
      runBtn.disabled = false;
    }
  }

  function wireTabs() {
    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        document.querySelectorAll(".tab-panel").forEach(function (panel) { panel.classList.remove("active"); });
        byId("tab-" + tab.getAttribute("data-tab")).classList.add("active");
      });
    });
  }
  function wireSearches() {
    [
      ["dataSearch", function () { renderSimpleTable("dataTable", dataIssues, "dataSearch", 4); }],
      ["communicationSearch", function () { renderSimpleTable("communicationTable", communicationIssues, "communicationSearch", 5); }],
      ["assetExceptionSearch", function () { renderSimpleTable("assetExceptionTable", assetExceptionIssues, "assetExceptionSearch", 4); }],
      ["ruleSearch", function () { renderSimpleTable("ruleTable", noisyRuleIssues, "ruleSearch", 4); }],
      ["faultSearch", function () { renderSimpleTable("faultTable", faultIssues, "faultSearch", 6); }],
      ["allSearch", function () { renderSimpleTable("allTable", allIssues, "allSearch", 6); }]
    ].forEach(function (item) { byId(item[0]).addEventListener("input", item[1]); });
  }

  function wireUi(api) {
    wireTabs(); wireSearches();
    byId("runAudit").addEventListener("click", function () { runAudit(api); });
    byId("exportCsv").addEventListener("click", exportCsv);
  }

  if (!window.geotab || !window.geotab.addin) byId("localWarning").className = "notice warning";
  else window.geotab.addin[ADDIN_NAMESPACE] = function () {
    return { initialize: function (api, state, callback) { wireUi(api); if (callback) callback(); }, focus: function () {}, blur: function () {} };
  };
}());
