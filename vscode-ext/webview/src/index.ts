import '../style.css'; // Imported so vite can process it

import { $ } from './util.js';
import { takeSnap } from './snap.js';
import { createHighlighterCore } from 'shiki';
import js from 'shiki/dist/langs/javascript.mjs';
import ts from 'shiki/dist/langs/typescript.mjs';
import rust from 'shiki/dist/langs/rust.mjs';
import python from 'shiki/dist/langs/python.mjs';
import vyper from 'shiki/dist/langs/vyper.mjs';
import markfown from 'shiki/dist/langs/markdown.mjs';
import githubDark from 'shiki/dist/themes/github-dark.mjs';
import solidity from 'shiki/dist/langs/solidity.mjs';
import { createJavaScriptRegexEngine } from 'shiki/dist/engine-javascript.mjs';

const windowTitleNode = $('#window-title');
const copyLinkButton = $('#copy-url');
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

createHighlighterCore({
    themes: [githubDark],
    langs: [js, ts, solidity, python, rust, vyper, markfown],
    engine: jsEngine,
}).then((shiki) => {
    
    vscode.postMessage({
        type: 'Webview Ready',
    });
    
    copyButton.addEventListener('click', () => takeSnap(vscode, { ...config, shutterAction: 'copy' }));
    saveButton.addEventListener('click', () => takeSnap(vscode, { ...config, shutterAction: 'save' }));
    copyLinkButton.addEventListener('click', () => {
        const url = solarSpaceUrl.textContent;
        navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([url], { type: 'text/plain' }) })]);
        vscode.postMessage({
            type: 'Copied Link',
        });
    });
    
    document.body.addEventListener('click', (event) => {
        const target = event.target;
        if (target instanceof HTMLButtonElement) {
            const action = target.value;
            if (action) {
                vscode.postMessage({
                    type: action,
                });
            }
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
                    ${action ?
                        `<button value="${action}" class="secondary">
                            <i class="codicon ${actionClass}"></i>${action}
                        </button>`
                        : ''}
                </div>`;
            }).join('');
            notifications.innerHTML = errorHtml;
            
            solarSpaceUrl.textContent = url ?? '';
            
            
            snippet.innerHTML = shiki.codeToHtml(text, {
                lang: language,
                theme: 'github-dark',
                colorReplacements: {
                    '#24292e': 'var(--vscode-editor-background)',
                }
            });
        }
    });
    
});