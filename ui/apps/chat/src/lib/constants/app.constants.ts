import { BRAND } from '../brand/index.ts';

/** The app's name: the brand's, or VITE_PUBLIC_APP_NAME */
export const APP_NAME = BRAND.name;

/** The interface language, for `<html lang>`: the brand's, or VITE_PUBLIC_APP_LANG */
export const APP_LANG = BRAND.lang;

/** Stands for APP_LANG in app.html until hooks.server.ts fills it in */
export const APP_LANG_PLACEHOLDER = '%app.lang%';
