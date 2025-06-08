import { $ } from './util.js';
import { takeSnap } from './snap.js';
import { createHighlighter } from 'shiki';
import { createJavaScriptRegexEngine } from 'shiki/dist/engine-javascript.mjs';

const windowTitleNode = $('#window-title');
const btnSave = $('#save');
const snippet = $('#snippet');

let config;


const jsEngine = createJavaScriptRegexEngine();

createHighlighter({
  themes: ['github-dark'],
  langs: ['javascript', 'solidity'],
  engine: jsEngine,
}).then((shiki) => {

  btnSave.addEventListener('click', () => takeSnap({ ...config, shutterAction: 'copy' }));

  window.addEventListener('message', ({ data: { type, ...cfg } }) => {
    if (type === 'update') {
      config = cfg;

      const {
        windowTitle,
        text,
        language,
        selection
      } = config;

      windowTitleNode.textContent = windowTitle;

      snippet.innerHTML = shiki.codeToHtml(text, {
        lang: 'solidity',
        theme: 'github-dark',
        colorReplacements: {
          '#24292e': 'var(--vscode-editor-background)',
        }
      });
    }
  });

});