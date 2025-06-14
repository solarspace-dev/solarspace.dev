export const $ = (q, c = document) => c.querySelector(q);

export const $$ = (q, c = document) => Array.from(c.querySelectorAll(q));
