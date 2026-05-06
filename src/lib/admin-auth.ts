const STORAGE_KEY = 'phoneticly_admin_authed';

export function isAdminAuthed() {
  return sessionStorage.getItem(STORAGE_KEY) === 'true';
}

export function setAdminAuthed(value: boolean) {
  sessionStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
}

export function clearAdminAuthed() {
  sessionStorage.removeItem(STORAGE_KEY);
}

