const LAST_ACTIVITY_KEY = "studentWorkspace:lastActivity";
const BOOKMARKS_KEY = "studentWorkspace:bookmarks";
const REMINDER_SETTINGS_KEY = "studentWorkspace:reminders";

const defaultReminderSettings = {
  enabled: false,
  time: "19:00",
  browserNotifications: false,
  lastNotifiedOn: "",
  label: "Evening revision check-in"
};

const readJson = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("student-workspace:updated"));
};

export function getLastActivity() {
  return readJson(LAST_ACTIVITY_KEY, null);
}

export function saveLastActivity(activity) {
  if (!activity?.title || !activity?.path) return;

  writeJson(LAST_ACTIVITY_KEY, {
    title: activity.title,
    path: activity.path,
    detail: activity.detail || "",
    section: activity.section || "workspace",
    updatedAt: new Date().toISOString()
  });
}

export function getBookmarks() {
  return readJson(BOOKMARKS_KEY, []);
}

export function addBookmark(item) {
  if (!item?.title) return;

  const existing = getBookmarks();
  const id =
    item.id ||
    `${item.type || "item"}-${item.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const next = [
    {
      id,
      title: item.title,
      note: item.note || "",
      type: item.type || "bookmark",
      source: item.source || "workspace",
      path: item.path || "",
      actionLabel: item.actionLabel || "",
      createdAt: new Date().toISOString()
    },
    ...existing.filter((entry) => entry.id !== id)
  ].slice(0, 30);

  writeJson(BOOKMARKS_KEY, next);
}

export function removeBookmark(id) {
  const next = getBookmarks().filter((entry) => entry.id !== id);
  writeJson(BOOKMARKS_KEY, next);
}

export function getReminderSettings() {
  return {
    ...defaultReminderSettings,
    ...readJson(REMINDER_SETTINGS_KEY, {})
  };
}

export function saveReminderSettings(settings) {
  writeJson(REMINDER_SETTINGS_KEY, {
    ...defaultReminderSettings,
    ...settings
  });
}

export function isReminderDue(settings = getReminderSettings(), currentDate = new Date()) {
  if (!settings.enabled || !settings.time) return false;

  const [hours, minutes] = String(settings.time)
    .split(":")
    .map((value) => Number(value || 0));

  const scheduled = new Date(currentDate);
  scheduled.setHours(hours, minutes, 0, 0);

  const today = currentDate.toISOString().slice(0, 10);

  return (
    currentDate.getTime() >= scheduled.getTime() &&
    settings.lastNotifiedOn !== today
  );
}

export function markReminderNotified(currentDate = new Date()) {
  const settings = getReminderSettings();
  saveReminderSettings({
    ...settings,
    lastNotifiedOn: currentDate.toISOString().slice(0, 10)
  });
}
