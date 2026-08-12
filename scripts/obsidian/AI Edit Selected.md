/*
  AI Edit Selected — ExcalidrawAutomate script for Obsidian Excalidraw plugin
  ---------------------------------------------------------------------------
  FloatingModal: show chip summaries of the current selection (with × to drop),
  optional NL instruction, then write a vault JSON file for MCP get_selection.

  Install: copy into Obsidian Excalidraw Scripts folder; hotkey Ctrl+Alt+E.

  Obsidian vault root (this workspace):
    E:/Learn_zone/Mark_down/Ob_Responsity/Coding_Responsity
  MCP EXCALIDRAW_EXPORT_DIR (parent sandbox, NOT the vault root):
    E:/Learn_zone/Mark_down

  Bridge path (vault-relative → absolute under vault):
    暂存/插件开发测试/.ai-selection.json
  Same file as seen by MCP (EXPORT_DIR-relative):
    Ob_Responsity/Coding_Responsity/暂存/插件开发测试/.ai-selection.json

  filePath in payload is EXPORT_DIR-relative (MCP_VAULT_PREFIX + vault path)
  so import_from_obsidian works without the agent rewriting paths.

  Buttons:
    清空     — clear Modal working set + canvas selection (does NOT touch disk)
    清除传入 — remove .ai-selection.json bridge file for MCP
    确认传入 — write bridge JSON
*/

/** Vault-relative staging (Obsidian app.vault paths). */
const SELECTION_REL = "暂存/插件开发测试/.ai-selection.json";
const SELECTION_FOLDER = "暂存/插件开发测试";
/** Prefix vault paths so MCP (EXPORT_DIR=Mark_down) can open them. */
const MCP_VAULT_PREFIX = "Ob_Responsity/Coding_Responsity/";

function truncateText(text, maxLen) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen) + "…";
}

function buildElementIndex(working) {
  const byId = {};
  for (let i = 0; i < working.length; i++) {
    if (working[i] && working[i].id) byId[working[i].id] = working[i];
  }
  try {
    const all = ea.getViewElements() || [];
    for (let i = 0; i < all.length; i++) {
      if (all[i] && all[i].id && !byId[all[i].id]) {
        byId[all[i].id] = all[i];
      }
    }
  } catch (e) {}
  return byId;
}

function resolveDisplayText(el, byId) {
  const direct = (el.text || el.originalText || "").trim();
  if (direct) return direct;
  if (!el.boundElements || !el.boundElements.length) return "";
  for (let j = 0; j < el.boundElements.length; j++) {
    const b = el.boundElements[j];
    if (!b || !b.id) continue;
    if (b.type && b.type !== "text") continue;
    const bound = byId[b.id];
    if (!bound) continue;
    const t = (bound.text || bound.originalText || "").trim();
    if (t) return t;
  }
  return "";
}

function shouldSkipChip(el, workingIds) {
  if (el.type !== "text") return false;
  const containerId = el.containerId;
  if (!containerId) return false;
  return !!workingIds[containerId];
}

function chipLabel(el, byId) {
  const short = truncateText(resolveDisplayText(el, byId), 24);
  const idTail = (el.id || "").slice(-6);
  const w = Math.round(el.width || 0);
  const h = Math.round(el.height || 0);
  return (
    (el.type || "?") +
    (short ? ": " + short : "") +
    " · " +
    idTail +
    " · " +
    w +
    "×" +
    h
  );
}

function toPayloadElement(el, byId) {
  const boundIds = [];
  if (el.boundElements) {
    for (let j = 0; j < el.boundElements.length; j++) {
      if (el.boundElements[j] && el.boundElements[j].id) {
        boundIds.push(el.boundElements[j].id);
      }
    }
  }
  return {
    id: el.id,
    type: el.type,
    x: el.x,
    y: el.y,
    width: el.width || 0,
    height: el.height || 0,
    text: resolveDisplayText(el, byId),
    fontSize: el.fontSize,
    fontFamily: el.fontFamily,
    strokeColor: el.strokeColor,
    backgroundColor: el.backgroundColor,
    strokeWidth: el.strokeWidth,
    strokeStyle: el.strokeStyle || "solid",
    fillStyle: el.fillStyle || "solid",
    roughness: el.roughness || 0,
    opacity: el.opacity || 100,
    groupIds: el.groupIds || [],
    boundElementIds: boundIds,
    locked: el.locked || false,
  };
}

async function ensureFolder(folderPath) {
  const parts = folderPath.split("/").filter(Boolean);
  let cur = "";
  for (let i = 0; i < parts.length; i++) {
    cur = cur ? cur + "/" + parts[i] : parts[i];
    try {
      const exists = await app.vault.adapter.exists(cur);
      if (!exists) {
        await app.vault.createFolder(cur);
      }
    } catch (e) {
      // createFolder throws if exists — ignore
    }
  }
}

async function clearBridgeFile() {
  try {
    const exists = await app.vault.adapter.exists(SELECTION_REL);
    if (exists) {
      await app.vault.adapter.remove(SELECTION_REL);
    }
    new Notice("已清除 MCP 选中桥");
  } catch (err) {
    console.error("clear bridge failed", err);
    new Notice("清除失败: " + (err && err.message ? err.message : err));
  }
}

const initial = ea.getViewSelectedElements();
if (!initial || initial.length === 0) {
  new Notice("No element selected. Click on an element first.");
  return;
}

let working = initial.slice();
let instruction = "";

const modal = new ea.FloatingModal(ea.plugin.app);

modal.onOpen = () => {
  const { contentEl } = modal;
  contentEl.empty();
  contentEl.createEl("h3", { text: "AI Edit — 选中目标" });

  const summaryEl = contentEl.createEl("p", {
    text: "",
    cls: "ai-edit-summary",
  });
  const chipHost = contentEl.createDiv({ cls: "ai-edit-chips" });
  chipHost.style.maxHeight = "220px";
  chipHost.style.overflowY = "auto";
  chipHost.style.marginBottom = "12px";

  function renderChips() {
    const byId = buildElementIndex(working);
    const workingIds = {};
    for (let i = 0; i < working.length; i++) {
      if (working[i] && working[i].id) workingIds[working[i].id] = true;
    }

    const visible = [];
    for (let i = 0; i < working.length; i++) {
      if (!shouldSkipChip(working[i], workingIds)) visible.push(i);
    }

    summaryEl.setText(
      "已选 " +
        working.length +
        " 个要素（显示 " +
        visible.length +
        "；× 取消选中）"
    );
    chipHost.empty();

    for (let v = 0; v < visible.length; v++) {
      const idx = visible[v];
      const el = working[idx];
      const row = chipHost.createDiv();
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.gap = "8px";
      row.style.padding = "4px 0";
      row.style.borderBottom = "1px solid var(--background-modifier-border)";

      const label = row.createSpan({ text: chipLabel(el, byId) });
      label.style.flex = "1";
      label.style.fontSize = "12px";
      label.style.overflow = "hidden";
      label.style.textOverflow = "ellipsis";
      label.style.whiteSpace = "nowrap";

      const xBtn = row.createEl("button", { text: "×" });
      xBtn.setAttr("aria-label", "取消选中");
      xBtn.style.minWidth = "28px";
      xBtn.onclick = () => {
        working.splice(idx, 1);
        try {
          ea.selectElementsInView(working);
        } catch (e) {
          console.error("selectElementsInView failed", e);
        }
        renderChips();
      };
    }
  }

  renderChips();

  new ea.obsidian.Setting(contentEl)
    .setName("指令（可选）")
    .setDesc("确认后写入 .ai-selection.json，供 MCP get_selection 读取")
    .addTextArea((ta) => {
      ta.setPlaceholder("例如：把这个框改成绿色，文字居中…");
      ta.onChange((v) => {
        instruction = v;
      });
      ta.inputEl.rows = 3;
      ta.inputEl.style.width = "100%";
    });

  new ea.obsidian.Setting(contentEl)
    .addButton((btn) =>
      btn.setButtonText("清空").setTooltip("只清空 Modal/画布选中，不动磁盘桥").onClick(() => {
        working = [];
        try {
          ea.selectElementsInView([]);
        } catch (e) {}
        renderChips();
      })
    )
    .addButton((btn) =>
      btn.setButtonText("清除传入").setTooltip("删除 .ai-selection.json").onClick(async () => {
        await clearBridgeFile();
      })
    )
    .addButton((btn) =>
      btn.setButtonText("取消").onClick(() => {
        modal.close();
      })
    )
    .addButton((btn) =>
      btn
        .setButtonText("确认传入")
        .setCta()
        .onClick(async () => {
          if (working.length === 0) {
            new Notice("没有选中要素，无法传入。");
            return;
          }

          let filePath = "";
          try {
            filePath = (ea.targetView && ea.targetView.file && ea.targetView.file.path) || "";
          } catch (e) {
            try {
              filePath = (app.workspace.getActiveFile() && app.workspace.getActiveFile().path) || "";
            } catch (e2) {}
          }

          const byId = buildElementIndex(working);
          const mcpFilePath = filePath
            ? MCP_VAULT_PREFIX + filePath.replace(/^\/+/, "")
            : "";
          const payload = {
            elements: working.map((el) => toPayloadElement(el, byId)),
            timestamp: new Date().toISOString(),
            source: "obsidian-ea-script",
            filePath: mcpFilePath,
            instruction: (instruction || "").trim(),
          };

          try {
            await ensureFolder(SELECTION_FOLDER);
            await app.vault.adapter.write(
              SELECTION_REL,
              JSON.stringify(payload, null, 2)
            );
            new Notice(
              "已传入 " +
                working.length +
                " 个要素 → MCP get_selection\n" +
                SELECTION_REL +
                (filePath ? "\n图: " + filePath : "")
            );
            modal.close();
          } catch (err) {
            console.error("AI Edit Selected write failed", err);
            new Notice("写入失败: " + (err && err.message ? err.message : err));
          }
        })
    );
};

modal.open();
