import { $, $$ } from './util.js';
import domtoimage from 'dom-to-image-even-more';

const windowNode = $('#window');
const snippetContainerNode = $('#snippet-container');

const SNAP_SCALE = 2;

export interface SnapConfig {
    target: 'container' | 'window';
    shutterAction: 'copy' | 'save';
}

export
async function takeSnap (vscode, config: SnapConfig) {
    windowNode.style.resize = 'none';
    
    const target = config.target === 'container' ? snippetContainerNode : windowNode;
    
    const url = await domtoimage.toPng(target, {
        bgColor: 'transparent',
        scale: SNAP_SCALE,
        postProcess: (node) => {
            $$('#snippet-container, #snippet, .line, .line-code span', node).forEach(
                (span) => (span.style.width = 'unset')
            );
            $$('.line-code', node).forEach((span) => (span.style.width = '100%'));
        }
    });
    
    const data = url.slice(url.indexOf(',') + 1);
    if (config.shutterAction === 'copy') {
        const binary = atob(data);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
        const blob = new Blob([array], { type: 'image/png' });
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        vscode.postMessage({ type: 'Copied Snapshot' });
    } else {
        vscode.postMessage({ type: 'Save Snapshot', data });
    }
    
    windowNode.style.resize = 'horizontal';
};
