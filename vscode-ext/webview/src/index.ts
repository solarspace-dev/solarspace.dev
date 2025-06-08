import { $ } from './util.js';
import { takeSnap } from './snap.js';
import { createHighlighter } from 'shiki';
import { createJavaScriptRegexEngine } from 'shiki/dist/engine-javascript.mjs';

const windowTitleNode = $('#window-title');
const copyButton = $('#copy');
const snippet = $('#snippet');

let config;


const jsEngine = createJavaScriptRegexEngine();

createHighlighter({
  themes: ['github-dark'],
  langs: ['javascript', 'solidity'],
  engine: jsEngine,
}).then((shiki) => {

  copyButton.addEventListener('click', () => takeSnap({ ...config, shutterAction: 'copy' }));

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