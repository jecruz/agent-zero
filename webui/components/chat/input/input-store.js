import { createStore } from "/js/AlpineStore.js";
import * as shortcuts from "/js/shortcuts.js";
import { store as fileBrowserStore } from "/components/modals/file-browser/file-browser-store.js";
import { store as messageQueueStore } from "/components/chat/message-queue/message-queue-store.js";
import { store as attachmentsStore } from "/components/chat/attachments/attachmentsStore.js";
import { store as chatsStore } from "/components/sidebar/chats/chats-store.js";

const model = {
  paused: false,
  canceled: false,
  message: "",
  
  // Prompt history for Up arrow cycling
  promptHistory: [],
  promptHistoryIndex: -1,
  MAX_HISTORY: 10,

  _getSendState() {
    const hasInput = this.message.trim() || attachmentsStore?.attachments?.length > 0;
    const hasQueue = !!messageQueueStore?.hasQueue;
    const running = !!chatsStore.selectedContext?.running;

    if (this.paused) return "paused";
    if (running) return "processing";
    if (hasQueue && !hasInput) return "all";
    if ((running || hasQueue) && hasInput) return "queue";
    return "normal";
  },

  get inputPlaceholder() {
    const state = this._getSendState();
    if (state === "all") return "Press Enter to send queued messages";
    if (state === "processing") return "Processing...";
    if (state === "paused") return "Paused - press Enter to resume";
    return "Type your message here...";
  },

  // Computed: send button icon type
  get sendButtonIcon() {
    const state = this._getSendState();
    if (state === "paused") return "play_arrow";
    if (state === "processing") return "pause";
    if (state === "all") return "send_and_archive";
    if (state === "queue") return "schedule_send";
    return "send";
  },

  // Computed: send button CSS class
  get sendButtonClass() {
    const state = this._getSendState();
    if (state === "paused") return "send-paused";
    if (state === "processing") return "send-processing";
    if (state === "all") return "send-queue send-all";
    if (state === "queue") return "send-queue queue";
    return "";
  },

  // Computed: send button title
  get sendButtonTitle() {
    const state = this._getSendState();
    if (state === "paused") return "Resume Agent";
    if (state === "processing") return "Pause Agent";
    if (state === "all") return "Send all queued messages";
    if (state === "queue") return "Add to queue";
    return "Send message";
  },

  init() {
    console.log("Input store initialized");
    // Event listeners are now handled via Alpine directives in the component
  },

  async sendMessage() {
    // Delegate to the global function
    if (globalThis.sendMessage) {
      await globalThis.sendMessage();
    }
  },

  adjustTextareaHeight() {
    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
      if (!this.message) chatInput.value = "";
      chatInput.style.height = "auto";
      chatInput.style.height = chatInput.scrollHeight + "px";
    }
  },

  async pauseAgent(paused) {
    const prev = this.paused;
    this.paused = paused;
    this.canceled = false;
    try {
      const context = globalThis.getContext?.();
      if (!globalThis.sendJsonData)
        throw new Error("sendJsonData not available");
      await globalThis.sendJsonData("/pause", { paused, context });
    } catch (e) {
      this.paused = prev;
      if (globalThis.toastFetchError) {
        globalThis.toastFetchError("Error pausing agent", e);
      }
    }
  },

  async stopAgent() {
    const prev = this.canceled;
    this.canceled = true;
    this.paused = false;
    try {
      const context = globalThis.getContext?.();
      if (!globalThis.sendJsonData)
        throw new Error("sendJsonData not available");
      await globalThis.sendJsonData("/chat_stop", { context });
    } catch (e) {
      this.canceled = prev;
      if (globalThis.toastFetchError) {
        globalThis.toastFetchError("Error stopping agent", e);
      }
    }
  },

  // Add current message to prompt history
  _addToHistory(message) {
    if (!message?.trim()) return;
    // Remove duplicate if exists
    const idx = this.promptHistory.indexOf(message);
    if (idx !== -1) {
      this.promptHistory.splice(idx, 1);
    }
    // Add to beginning
    this.promptHistory.unshift(message);
    // Trim to max size
    if (this.promptHistory.length > this.MAX_HISTORY) {
      this.promptHistory.pop();
    }
    // Reset index to beginning (most recent)
    this.promptHistoryIndex = 0;
  },

  // Cycle to previous prompt in history (Up arrow)
  cycleHistoryUp() {
    if (this.promptHistory.length === 0) return false;
    if (this.promptHistoryIndex < this.promptHistory.length - 1) {
      this.promptHistoryIndex++;
      this.message = this.promptHistory[this.promptHistoryIndex];
      return true;
    }
    return false;
  },

  // Cycle to next prompt in history (Down arrow)
  cycleHistoryDown() {
    if (this.promptHistory.length === 0) return false;
    if (this.promptHistoryIndex > 0) {
      this.promptHistoryIndex--;
      this.message = this.promptHistory[this.promptHistoryIndex];
      return true;
    } else {
      this.promptHistoryIndex = -1;
      this.message = "";
      return true;
    }
  },

  async nudge() {
    try {
      const context = globalThis.getContext();
      await globalThis.sendJsonData("/nudge", { ctxid: context });
    } catch (e) {
      if (globalThis.toastFetchError) {
        globalThis.toastFetchError("Error nudging agent", e);
      }
    }
  },

  async loadKnowledge() {
    try {
      const resp = await shortcuts.callJsonApi("/knowledge_path_get", {
        ctxid: shortcuts.getCurrentContextId(),
      });
      if (!resp.ok) throw new Error("Error getting knowledge path");
      const path = resp.path;

      // open file browser and wait for it to close
      await fileBrowserStore.open(path);

      // progress notification
      shortcuts.frontendNotification({
        type: shortcuts.NotificationType.PROGRESS,
        message: "Loading knowledge...",
        priority: shortcuts.NotificationPriority.NORMAL,
        displayTime: 999,
        group: "knowledge_load",
        frontendOnly: true,
      });

      // then reindex knowledge
      await globalThis.sendJsonData("/knowledge_reindex", {
        ctxid: shortcuts.getCurrentContextId(),
      });

      // finished notification
      shortcuts.frontendNotification({
        type: shortcuts.NotificationType.SUCCESS,
        message: "Knowledge loaded successfully",
        priority: shortcuts.NotificationPriority.NORMAL,
        displayTime: 2,
        group: "knowledge_load",
        frontendOnly: true,
      });
    } catch (e) {
      // error notification
      shortcuts.frontendNotification({
        type: shortcuts.NotificationType.ERROR,
        message: "Error loading knowledge",
        priority: shortcuts.NotificationPriority.NORMAL,
        displayTime: 5,
        group: "knowledge_load",
        frontendOnly: true,
      });
    }
  },

  // previous implementation without projects
  async _loadKnowledge() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.pdf,.csv,.html,.json,.md";
    input.multiple = true;

    input.onchange = async () => {
      try {
        const formData = new FormData();
        for (let file of input.files) {
          formData.append("files[]", file);
        }

        formData.append("ctxid", globalThis.getContext());

        const response = await globalThis.fetchApi("/import_knowledge", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          if (globalThis.toast)
            globalThis.toast(await response.text(), "error");
        } else {
          const data = await response.json();
          if (globalThis.toast) {
            globalThis.toast(
              "Knowledge files imported: " + data.filenames.join(", "),
              "success"
            );
          }
        }
      } catch (e) {
        if (globalThis.toastFetchError) {
          globalThis.toastFetchError("Error loading knowledge", e);
        }
      }
    };

    input.click();
  },

  async browseFiles(path) {
    if (!path) {
      try {
        const resp = await shortcuts.callJsonApi("/chat_files_path_get", {
          ctxid: shortcuts.getCurrentContextId(),
        });
        if (resp.ok) path = resp.path;
      } catch (_e) {
        console.error("Error getting chat files path", _e);
      }
    }
    await fileBrowserStore.open(path);
  },

  reset() {
    this.message = "";
    this.canceled = false;
    this.promptHistoryIndex = -1;
    attachmentsStore.clearAttachments();
    this.adjustTextareaHeight();
  }
};

const store = createStore("chatInput", model);

export { store };
