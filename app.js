(function () {
  "use strict";

  var ADDIN_NAMESPACE = "geotabauditlite";
  var allIssues = [];
  var lastStats = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    byId(id).textContent = value;
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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
    try {
      return d.toLocaleString();
    } catch (e) {
      return String(value);
    }
  }

  function daysOld(dateValue) {
    var d = safeDate(dateValue);
    if (!d) return null;
    return Math.floor((new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getDeviceName(deviceLike) {
    if (!deviceLike) return "Dispositivo sconosciuto";
    if (deviceLike.name) return deviceLike.name;
    if (deviceLike.device && deviceLike.device.name) return deviceLike.device.name;
    if (deviceLike.id) return deviceLike.id;
    if (deviceLike.device && deviceLike.device.id) return deviceLike.device.id;
    return "Dispositivo sconosciuto";
  }

  function isActiveDevice(device) {
    if (!device || device.id === "NoDeviceId") return false;

    var now = new Date();
    var activeFrom = safeDate(device.activeFrom);
    var activeTo = safeDate(device.activeTo);

    if (activeFrom && activeFrom > now) return false;
    if (activeTo && activeTo < now) return false;

    return true;
  }

  function issueKey(issue) {
    return [issue.severity, issue.area, issue.asset, issue.problem].join("|");
  }

  function addIssue(severity, area, asset, problem, evidence, action, sortWeight) {
    var issue = {
      severity: severity,
      area: area,
      asset: asset,
      problem: problem,
      evidence: evidence,
      action: action,
      sortWeight: sortWeight || 99
    };

    // Evita duplicati identici nel caso in cui MyGeotab restituisca righe ripetute.
    var key = issueKey(issue);
    for (var i = 0; i < allIssues.length; i++) {
      if (issueKey(allIssues[i]) === key) return;
    }

    allIssues.push(issue);
  }

  function apiGet(api, typeName, search, resultsLimit) {
    return new Promise(function (resolve, reject) {
      api.call(
        "Get",
        {
          typeName: typeName,
          search: search || {},
          resultsLimit: resultsLimit || 5000
        },
        function (result) { resolve(result || []); },
        function (error) { reject(error); }
      );
    });
  }

  function calculateScore(totalDevices, critical, medium, low) {
    if (totalDevices <= 0) return 0;

    var weighted = (critical * 8) + (medium * 3) + (low * 1);
    var normalizedPenalty = Math.min(95, Math.round(weighted / Math.max(1, totalDevices) * 8));
    return Math.max(0, 100 - normalizedPenalty);
  }

  function scoreText(score) {
    if (score >= 85) return "Buono: pochi problemi operativi evidenti.";
    if (score >= 65) return "Attenzione: ci sono elementi da verificare.";
    if (score >= 40) return "Critico: dati e configurazione richiedono pulizia.";
    return "Molto critico: prima sistemare comunicazione e anagrafica.";
  }

  function severityClass(severity) {
    if (severity === "Critica") return "critica";
    if (severity === "Media") return "media";
    return "bassa";
  }

  function severityWeight(severity) {
    if (severity === "Critica") return 1;
    if (severity === "Media") return 2;
    return 3;
  }

  function filteredIssues() {
    var severity = byId("severityFilter").value;
    var area = byId("areaFilter").value;
    var viewMode = byId("viewMode").value;
    var text = byId("textFilter").value.trim().toLowerCase();

    return allIssues.filter(function (issue) {
      if (viewMode === "priority" && issue.severity === "Bassa") return false;
      if (severity && issue.severity !== severity) return false;
      if (area && issue.area !== area) return false;

      if (text) {
        var haystack = [
          issue.severity,
          issue.area,
          issue.asset,
          issue.problem,
          issue.evidence,
          issue.action
        ].join(" ").toLowerCase();

        if (haystack.indexOf(text) === -1) return false;
      }

      return true;
    });
  }

  function updateAreaFilter() {
    var select = byId("areaFilter");
    var current = select.value;
    var areas = {};

    allIssues.forEach(function (issue) {
      areas[issue.area] = true;
    });

    select.innerHTML = '<option value="">Tutte</option>';

    Object.keys(areas).sort().forEach(function (area) {
      var opt = document.createElement("option");
      opt.value = area;
      opt.textContent = area;
      select.appendChild(opt);
    });

    if (areas[current]) select.value = current;
  }

  function renderIssues() {
    var tbody = byId("issuesTable");
    var issues = filteredIssues().sort(function (a, b) {
      if (severityWeight(a.severity) !== severityWeight(b.severity)) {
        return severityWeight(a.severity) - severityWeight(b.severity);
      }
      if (a.sortWeight !== b.sortWeight) return a.sortWeight - b.sortWeight;
      return String(a.asset).localeCompare(String(b.asset));
    });

    tbody.innerHTML = "";

    if (!issues.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">Nessun problema da mostrare con i filtri attuali.</div></td></tr>';
      return;
    }

    issues.forEach(function (issue) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        '<td><span class="pill ' + severityClass(issue.severity) + '">' + escapeHtml(issue.severity) + '</span></td>' +
        '<td>' + escapeHtml(issue.area) + '</td>' +
        '<td>' + escapeHtml(issue.asset) + '</td>' +
        '<td><div class="problem-title">' + escapeHtml(issue.problem) + '</div></td>' +
        '<td><div class="evidence">' + escapeHtml(issue.evidence) + '</div></td>' +
        '<td><div class="action">' + escapeHtml(issue.action) + '</div></td>';

      tbody.appendChild(tr);
    });
  }

  function countWhere(predicate) {
    var count = 0;
    allIssues.forEach(function (issue) {
      if (predicate(issue)) count++;
    });
    return count;
  }

  function renderActions() {
    var box = byId("actionsList");
    var actions = [];

    var noStatus = countWhere(function (i) { return i.problem === "Stato dispositivo non disponibile"; });
    var nonComm = countWhere(function (i) { return i.problem === "Dispositivo non comunicante"; });
    var oldData = countWhere(function (i) { return i.problem === "Ultimo dato troppo vecchio"; });
    var vinMissing = countWhere(function (i) { return i.problem === "VIN mancante"; });
    var groupsMissing = countWhere(function (i) { return i.problem === "Nessun gruppo assegnato"; });
    var serialMissing = countWhere(function (i) { return i.problem === "Seriale dispositivo mancante"; });

    if (noStatus > 0) {
      actions.push({
        count: noStatus,
        title: "Verificare dispositivi senza stato",
        text: "Sono asset attivi per cui non è stato trovato DeviceStatusInfo. Prima controlla se sono asset speciali, installazioni incomplete o veicoli non più in uso."
      });
    }

    if (nonComm > 0 || oldData > 0) {
      actions.push({
        count: nonComm + oldData,
        title: "Ripristinare comunicazione e dati recenti",
        text: "Questi mezzi rischiano di falsare report, KPI e controlli manutentivi. Priorità a installazione, alimentazione e copertura."
      });
    }

    if (vinMissing > 0 || serialMissing > 0) {
      actions.push({
        count: vinMissing + serialMissing,
        title: "Pulire l’anagrafica tecnica",
        text: "VIN o seriali mancanti rendono più fragile la manutenzione, le integrazioni e il confronto con altri sistemi."
      });
    }

    if (groupsMissing > 0) {
      actions.push({
        count: groupsMissing,
        title: "Sistemare la struttura gruppi",
        text: "Asset senza gruppo possono finire fuori da report, regole, permessi e viste operative."
      });
    }

    box.innerHTML = "";

    if (!actions.length) {
      box.innerHTML = '<div class="empty-state">Nessuna azione prioritaria rilevata nei controlli base.</div>';
      return;
    }

    actions.forEach(function (a) {
      var div = document.createElement("div");
      div.className = "action-item";
      div.innerHTML =
        '<div class="action-count">' + escapeHtml(a.count) + '</div>' +
        '<div><div class="action-title">' + escapeHtml(a.title) + '</div>' +
        '<div class="action-text">' + escapeHtml(a.text) + '</div></div>';
      box.appendChild(div);
    });
  }

  function renderBreakdown() {
    var box = byId("areaBreakdown");
    var counts = {};
    var max = 0;

    allIssues.forEach(function (issue) {
      counts[issue.area] = (counts[issue.area] || 0) + 1;
      if (counts[issue.area] > max) max = counts[issue.area];
    });

    box.innerHTML = "";

    var keys = Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a];
    });

    if (!keys.length) {
      box.innerHTML = '<div class="empty-state">Nessun problema rilevato.</div>';
      return;
    }

    keys.forEach(function (area) {
      var width = Math.max(4, Math.round((counts[area] / max) * 100));
      var row = document.createElement("div");
      row.className = "breakdown-row";
      row.innerHTML =
        '<div>' + escapeHtml(area) + '</div>' +
        '<div class="bar"><div class="bar-fill" style="width:' + width + '%"></div></div>' +
        '<div><strong>' + counts[area] + '</strong></div>';
      box.appendChild(row);
    });
  }

  function renderAll() {
    updateAreaFilter();
    renderActions();
    renderBreakdown();
    renderIssues();
  }

  function toCsvValue(value) {
    var s = String(value === undefined || value === null ? "" : value);
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function exportCsv() {
    var rows = filteredIssues();
    var header = ["Gravità", "Area", "Asset", "Problema", "Evidenza", "Azione consigliata"];
    var lines = [header.map(toCsvValue).join(",")];

    rows.forEach(function (issue) {
      lines.push([
        issue.severity,
        issue.area,
        issue.asset,
        issue.problem,
        issue.evidence,
        issue.action
      ].map(toCsvValue).join(","));
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

  function analyse(devices, statuses) {
    allIssues = [];

    var thresholdDays = parseInt(byId("offlineDays").value, 10);
    if (isNaN(thresholdDays) || thresholdDays < 1) thresholdDays = 3;

    var activeDevices = devices.filter(isActiveDevice);
    var statusByDeviceId = {};

    statuses.forEach(function (statusItem) {
      var id = statusItem.device && statusItem.device.id ? statusItem.device.id : "";
      if (id) statusByDeviceId[id] = statusItem;
    });

    activeDevices.forEach(function (device) {
      var deviceId = device.id || "";
      var name = getDeviceName(device);
      var status = statusByDeviceId[deviceId];

      if (!status) {
        addIssue(
          "Critica",
          "Comunicazione",
          name,
          "Stato dispositivo non disponibile",
          "Nessun DeviceStatusInfo trovato per questo dispositivo attivo.",
          "Verificare se l’asset è speciale, se è installato correttamente o se deve essere archiviato.",
          1
        );
      } else {
        var oldDays = daysOld(status.dateTime);
        var dateEvidence = "Ultimo dato: " + formatDate(status.dateTime);
        if (oldDays !== null) dateEvidence += " (" + oldDays + " giorni fa).";

        if (status.isDeviceCommunicating === false) {
          addIssue(
            "Critica",
            "Comunicazione",
            getDeviceName(status),
            "Dispositivo non comunicante",
            "DeviceStatusInfo.isDeviceCommunicating = false. " + dateEvidence,
            "Verificare alimentazione, installazione, copertura rete e stato GO device.",
            2
          );
        } else if (oldDays !== null && oldDays >= thresholdDays) {
          addIssue(
            "Critica",
            "Dati",
            getDeviceName(status),
            "Ultimo dato troppo vecchio",
            dateEvidence,
            "Controllare se il veicolo è fermo, scollegato o se il dispositivo non comunica.",
            3
          );
        }

        if (
          status.latitude === undefined || status.longitude === undefined ||
          status.latitude === null || status.longitude === null
        ) {
          addIssue(
            "Bassa",
            "GPS",
            getDeviceName(status),
            "Posizione GPS non disponibile",
            "Latitude/longitude mancanti nello stato corrente.",
            "Verificare se il veicolo è in area coperta o se il dato GPS è disponibile.",
            40
          );
        }

        if (status.exceptionEvents && status.exceptionEvents.length > 0) {
          addIssue(
            "Bassa",
            "Regole",
            getDeviceName(status),
            "Eventi eccezione attivi",
            "ExceptionEvents attivi: " + status.exceptionEvents.length + ".",
            "Aprire la sezione eccezioni/regole per capire se richiedono un’azione.",
            41
          );
        }
      }

      if (!device.serialNumber) {
        addIssue(
          "Media",
          "Anagrafica",
          name,
          "Seriale dispositivo mancante",
          "Campo Device.serialNumber vuoto o non disponibile.",
          "Verificare l’anagrafica del dispositivo in MyGeotab.",
          20
        );
      }

      if (!device.vehicleIdentificationNumber) {
        addIssue(
          "Media",
          "Anagrafica",
          name,
          "VIN mancante",
          "Campo Device.vehicleIdentificationNumber vuoto o non disponibile.",
          "Completare il VIN se la flotta lo usa per manutenzione, report o integrazioni.",
          21
        );
      }

      if (!device.groups || !device.groups.length) {
        addIssue(
          "Media",
          "Gruppi",
          name,
          "Nessun gruppo assegnato",
          "Campo Device.groups vuoto.",
          "Assegnare il veicolo al gruppo operativo corretto.",
          22
        );
      }
    });

    return {
      activeDeviceCount: activeDevices.length,
      totalDeviceCount: devices.length,
      statusCount: statuses.length
    };
  }

  async function runAudit(api) {
    var runBtn = byId("runAudit");
    var exportBtn = byId("exportCsv");
    runBtn.disabled = true;
    exportBtn.disabled = true;

    byId("status").textContent = "Controllo in corso: lettura DeviceStatusInfo e Device...";

    try {
      var results = await Promise.all([
        apiGet(api, "DeviceStatusInfo", {}, 5000),
        apiGet(api, "Device", {}, 5000)
      ]);

      var statuses = results[0];
      var devices = results[1];
      lastStats = analyse(devices, statuses);

      var critical = countWhere(function (x) { return x.severity === "Critica"; });
      var medium = countWhere(function (x) { return x.severity === "Media"; });
      var low = countWhere(function (x) { return x.severity === "Bassa"; });
      var score = calculateScore(lastStats.activeDeviceCount, critical, medium, low);

      setText("totalDevices", lastStats.activeDeviceCount);
      setText("criticalIssues", critical);
      setText("warningIssues", medium);
      setText("lowIssues", low);
      setText("healthScore", score + "/100");
      setText("healthText", scoreText(score));

      renderAll();

      byId("status").textContent =
        "Controllo completato. Device letti: " + lastStats.totalDeviceCount +
        ". Stati letti: " + lastStats.statusCount +
        ". Dispositivi attivi analizzati: " + lastStats.activeDeviceCount +
        ". Problemi trovati: " + allIssues.length + ".";

      exportBtn.disabled = allIssues.length === 0;
    } catch (error) {
      console.error("Geotab Audit Lite error:", error);
      byId("status").innerHTML =
        "Errore durante il controllo. Apri la console del browser per i dettagli. " +
        "Possibili cause: permessi insufficienti, Add-In non caricato correttamente o limite API.";
    } finally {
      runBtn.disabled = false;
    }
  }

  function wireUi(api) {
    byId("runAudit").addEventListener("click", function () {
      runAudit(api);
    });

    byId("exportCsv").addEventListener("click", exportCsv);

    ["severityFilter", "areaFilter", "viewMode"].forEach(function (id) {
      byId(id).addEventListener("change", renderIssues);
    });

    byId("textFilter").addEventListener("input", renderIssues);

    byId("viewMode").addEventListener("change", function () {
      if (byId("viewMode").value === "priority") {
        byId("tableHint").textContent = "Vista “Solo priorità”: mostra critici e medi. Cambia vista per vedere anche i problemi bassi.";
      } else {
        byId("tableHint").textContent = "Vista completa: mostra anche problemi informativi e diagnostica leggera.";
      }
    });
  }

  if (!window.geotab || !window.geotab.addin) {
    byId("localWarning").className = "notice warning";
  } else {
    window.geotab.addin[ADDIN_NAMESPACE] = function () {
      return {
        initialize: function (api, state, callback) {
          wireUi(api);
          if (callback) callback();
        },
        focus: function () {},
        blur: function () {}
      };
    };
  }
}());
