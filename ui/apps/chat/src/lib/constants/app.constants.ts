export const APP_NAME = import.meta.env?.VITE_PUBLIC_APP_NAME || 'llama-ui';

/** The interface language, for `<html lang>` and the PWA manifest */
export const APP_LANG = import.meta.env?.VITE_PUBLIC_APP_LANG || 'en';

/** Stands for APP_LANG in app.html until hooks.server.ts fills it in */
export const APP_LANG_PLACEHOLDER = '%app.lang%';
