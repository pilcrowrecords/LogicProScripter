// Scripter I/O Isolation Test — Expanded, Quiet Mode
// Only traces EXPOSED, PRESENT, or ERROR results.
// Play one note to trigger.

var hasRun = false;

function ProcessMIDI() {
  if (hasRun) return;
  hasRun = true;

  Trace("SCRIPTER I/O ISOLATION TEST — starting");

  // ─── 1. require() / CommonJS modules ──────────────────────────────────────
  var nodeModules = [
    "fs", "net", "http", "https", "dgram", "dns", "tls", "crypto",
    "os", "path", "child_process", "cluster", "worker_threads",
    "stream", "readline", "zlib", "url", "querystring", "buffer",
    "process", "vm", "module", "repl", "assert", "util"
  ];

  for (var i = 0; i < nodeModules.length; i++) {
    var mod = nodeModules[i];
    try {
      var m = require(mod);
      Trace("[EXPOSED] require('" + mod + "')");
    } catch (e) { }
  }

  // ─── 2. File system ───────────────────────────────────────────────────────
  try {
    var fsR = require("fs");
    var content = fsR.readFileSync("/etc/hosts", "utf8");
    Trace("[EXPOSED] fs.readFileSync — read " + content.length + " bytes");
  } catch (e) { }

  try {
    var fsW = require("fs");
    fsW.writeFileSync("/tmp/scripter_probe.txt", "probe");
    Trace("[EXPOSED] fs.writeFileSync — written");
  } catch (e) { }

  try {
    var fsA = require("fs");
    var entries = fsA.readdirSync("/tmp");
    Trace("[EXPOSED] fs.readdirSync('/tmp') — " + entries.length + " entries");
  } catch (e) { }

  try {
    var fsS = require("fs");
    var stat = fsS.statSync("/etc/hosts");
    Trace("[EXPOSED] fs.statSync — size " + stat.size);
  } catch (e) { }

  // ─── 3. XMLHttpRequest ────────────────────────────────────────────────────
  try {
    if (typeof XMLHttpRequest !== "undefined") {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "http://93.184.216.34", false);
      xhr.send();
      Trace("[EXPOSED] XHR GET — status " + xhr.status);
    }
  } catch (e) { }

  try {
    if (typeof XMLHttpRequest !== "undefined") {
      var xhrPost = new XMLHttpRequest();
      xhrPost.open("POST", "http://93.184.216.34", false);
      xhrPost.send("probe=1");
      Trace("[EXPOSED] XHR POST — status " + xhrPost.status);
    }
  } catch (e) { }

  // ─── 4. fetch ─────────────────────────────────────────────────────────────
  try {
    if (typeof fetch !== "undefined") {
      Trace("[EXPOSED] fetch — defined");
    }
  } catch (e) { }

  // ─── 5. WebSocket ─────────────────────────────────────────────────────────
  try {
    if (typeof WebSocket !== "undefined") {
      var ws = new WebSocket("ws://93.184.216.34");
      Trace("[EXPOSED] WebSocket — instantiated");
      ws.close();
    }
  } catch (e) { }

  // ─── 6. EventSource ───────────────────────────────────────────────────────
  try {
    if (typeof EventSource !== "undefined") {
      var es = new EventSource("http://93.184.216.34");
      Trace("[EXPOSED] EventSource — instantiated");
      es.close();
    }
  } catch (e) { }

  // ─── 7. WebRTC ────────────────────────────────────────────────────────────
  var rtcNames = [
    "RTCPeerConnection", "webkitRTCPeerConnection", "mozRTCPeerConnection",
    "RTCSessionDescription", "RTCIceCandidate", "RTCDataChannel"
  ];

  for (var r = 0; r < rtcNames.length; r++) {
    try {
      if (typeof this[rtcNames[r]] !== "undefined") {
        Trace("[EXPOSED] " + rtcNames[r] + " — defined");
      }
    } catch (e) {
      Trace("[ERROR]   " + rtcNames[r] + " — " + e.message);
    }
  }

  // ─── 8. Raw sockets ───────────────────────────────────────────────────────
  try {
    var netMod = require("net");
    var sock = netMod.createConnection(80, "93.184.216.34");
    Trace("[EXPOSED] net.createConnection — socket created");
    sock.destroy();
  } catch (e) { }

  try {
    var dgramMod = require("dgram");
    var udp = dgramMod.createSocket("udp4");
    Trace("[EXPOSED] dgram.createSocket — socket created");
    udp.close();
  } catch (e) { }

  // ─── 9. DNS ───────────────────────────────────────────────────────────────
  try {
    var dnsMod = require("dns");
    Trace("[EXPOSED] require('dns') — loaded");
    if (typeof dnsMod.lookup === "function") {
      Trace("[EXPOSED] dns.lookup — function exists");
    }
  } catch (e) { }

  // ─── 10. child_process ────────────────────────────────────────────────────
  try {
    var cp = require("child_process");
    Trace("[EXPOSED] require('child_process') — loaded");
    try {
      var result = cp.execSync("echo scripter_probe");
      Trace("[EXPOSED] execSync — output: " + result.toString().trim());
    } catch (e2) { }
  } catch (e) { }

  // ─── 11. eval / dynamic execution ─────────────────────────────────────────
  try {
    var evalResult = eval("1 + 1");
    Trace("[EXPOSED] eval — returned " + evalResult);
  } catch (e) { }

  try {
    var fn = new Function("return 42");
    Trace("[EXPOSED] new Function() — returned " + fn());
  } catch (e) { }

  try {
    if (typeof importScripts !== "undefined") {
      Trace("[EXPOSED] importScripts — defined");
    }
  } catch (e) { }

  // ─── 12. Workers / threading ──────────────────────────────────────────────
  var workerNames = ["Worker", "SharedWorker", "ServiceWorker"];
  for (var w = 0; w < workerNames.length; w++) {
    try {
      if (typeof this[workerNames[w]] !== "undefined") {
        Trace("[EXPOSED] " + workerNames[w] + " — defined");
      }
    } catch (e) {
      Trace("[ERROR]   " + workerNames[w] + " — " + e.message);
    }
  }

  // ─── 13. Storage APIs ─────────────────────────────────────────────────────
  var storageNames = [
    "localStorage", "sessionStorage", "indexedDB", "caches", "cookieStore"
  ];

  for (var s = 0; s < storageNames.length; s++) {
    try {
      if (typeof this[storageNames[s]] !== "undefined") {
        Trace("[EXPOSED] " + storageNames[s] + " — defined");
      }
    } catch (e) {
      Trace("[ERROR]   " + storageNames[s] + " — " + e.message);
    }
  }

  // ─── 14. Global survey ────────────────────────────────────────────────────
  var allGlobals = [
    // Node.js
    "process", "global", "Buffer", "require", "__dirname", "__filename",
    "module", "exports", "setImmediate", "clearImmediate",
    // Browser / Web APIs
    "window", "document", "navigator", "location", "history",
    "screen", "performance", "crypto", "Crypto",
    "fetch", "XMLHttpRequest", "WebSocket", "EventSource",
    "Request", "Response", "Headers", "URL", "URLSearchParams",
    "FormData", "Blob", "File", "FileReader",
    // Timers
    "setTimeout", "clearTimeout", "setInterval", "clearInterval",
    "requestAnimationFrame", "cancelAnimationFrame",
    // Execution
    "eval", "Function", "importScripts",
    // Workers
    "Worker", "SharedWorker", "ServiceWorker",
    // Storage
    "localStorage", "sessionStorage", "indexedDB", "caches", "cookieStore",
    // WebRTC
    "RTCPeerConnection", "RTCSessionDescription", "RTCIceCandidate",
    // Notifications
    "Notification", "alert", "confirm", "prompt",
    // Scripter-specific
    "Trace", "ProcessMIDI", "HandleMIDI", "PluginParameters",
    "GetParameter", "SetParameter", "NeedsTimingInfo", "TimingInfo",
    "MIDI", "Event", "Note", "NoteOn", "NoteOff",
    "ControlChange", "ProgramChange", "PitchBend", "Aftertouch",
    "PolyPressure", "TargetEvent", "Channel"
  ];

  for (var g = 0; g < allGlobals.length; g++) {
    var gname = allGlobals[g];
    try {
      if (typeof this[gname] !== "undefined") {
        Trace("[PRESENT] " + gname + " — " + typeof this[gname]);
      }
    } catch (e) {
      Trace("[ERROR]   " + gname + " — " + e.message);
    }
  }

  Trace("SCRIPTER I/O ISOLATION TEST — complete");
}