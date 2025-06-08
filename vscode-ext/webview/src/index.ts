import { $ } from './util.js';
import { takeSnap } from './snap.js';
import { createHighlighter } from 'shiki';
import { createJavaScriptRegexEngine } from 'shiki/dist/engine-javascript.mjs';

const windowTitleNode = $('#window-title');
const copyButton = $('#copy-snapshot');
const saveButton = $('#save-snapshot');
const snippet = $('#snippet');
const notifications = $('#notifications');
const solarSpaceUrl = $('#solar-space-url');

let config;

declare global {
  function acquireVsCodeApi();
}


const vscode = acquireVsCodeApi();
const jsEngine = createJavaScriptRegexEngine();

createHighlighter({
  themes: ['github-dark'],
  langs: ['javascript', 'solidity'],
  engine: jsEngine,
}).then((shiki) => {

  vscode.postMessage({
    type: 'Webview Ready',
  });

  copyButton.addEventListener('click', () => takeSnap(vscode, { ...config, shutterAction: 'copy' }));
  saveButton.addEventListener('click', () => takeSnap(vscode, { ...config, shutterAction: 'save' }));

  document.body.addEventListener('click', (event) => {
    const target = event.target as HTMLButtonElement;
    const action = target.value;
    if (action) {
      vscode.postMessage({
        type: action,
      });
    }
  });

  window.addEventListener('message', ({ data: { type, ...cfg } }) => {
    if (type === 'update') {
      config = cfg;

      const {
        windowTitle,
        text,
        language,
        url,
        errors,
      } = config;

      windowTitleNode.textContent = windowTitle;

      const errorHtml = errors.map(({ severityClass, message, action, actionClass }) => {
        return `<div class="notification ${severityClass}">
          <i class="codicon codicon-alert"></i>
          <span class="message">${message}</span>
          ${action ? `<button value="${action}" class="secondary"><i class="codicon ${actionClass}"></i>${action}</button>` : ''}
        </div>`;
      }).join('');
      notifications.innerHTML = errorHtml;

      solarSpaceUrl.textContent = url ?? '';


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