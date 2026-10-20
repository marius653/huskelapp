const TASKS_KEY = "huskelapp_tasks_v1";
const EVENTS_KEY = "huskelapp_events_v1";
const SETTINGS_KEY = "huskelapp_settings_v1";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function createLocalStore() {
  return {
    provider: "local",
    async getTasks() {
      const value = readJson(TASKS_KEY, []);
      return Array.isArray(value) ? value : [];
    },
    async saveTasks(tasks) {
      writeJson(TASKS_KEY, tasks);
    },
    async getEvents() {
      const value = readJson(EVENTS_KEY, []);
      return Array.isArray(value) ? value : [];
    },
    async saveEvents(events) {
      writeJson(EVENTS_KEY, events);
    },
    async getSettings() {
      const value = readJson(SETTINGS_KEY, {});
      return value && typeof value === "object" ? value : {};
    },
    async saveSettings(settings) {
      writeJson(SETTINGS_KEY, settings);
    }
  };
}
