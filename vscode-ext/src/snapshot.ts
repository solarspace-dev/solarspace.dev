import * as vscode from 'vscode';
import * as path from 'path';
import { homedir } from 'os';
import { readFile, writeFile } from 'fs/promises';

// Remember the last location where the user saved an image
// This is used to suggest the same location next time the user saves an image
let lastUsedImageUri = vscode.Uri.file(path.resolve(homedir(), 'Desktop/code.png'));

interface Snippet {
    text: string;
    language: string;
}

function getSnippet(): Snippet {
    const editor = vscode.window.activeTextEditor;
    const selection = editor?.selection;
    const snippet: Snippet = {
        text: editor?.document.getText(selection) || editor?.document.getText() || '',
        language: editor?.document.languageId ?? 'plaintext'
    };
    return snippet;
}

async function createPanel (context: vscode.ExtensionContext): Promise<vscode.WebviewPanel> {
    const panel = vscode.window.createWebviewPanel(
        'solarspace',
        'Share Solar Space',
        {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: true
        },
        {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(context.extensionPath)]
        }
    );
    panel.webview.html = await readHtml(
        path.resolve(context.extensionPath, 'webview/index.html'),
        panel
    );
    return panel;
}

async function saveImage (data: string): Promise<void> {
    const uri = await vscode.window.showSaveDialog({
        filters: { Images: ['png'] },
        defaultUri: lastUsedImageUri
    });
    if (uri) {
        lastUsedImageUri = uri;
        await writeFile(uri.fsPath, Buffer.from(data, 'base64'));
    }
}

async function runCommand (context: vscode.ExtensionContext): Promise<void> {
    const panel = await createPanel(context);
    const update = async (): Promise<void> => {
        panel.webview.postMessage({ type: 'update', ...getSnippet() });
    };
    
    panel.webview.onDidReceiveMessage(async ({ type, data }: { type: string; data: string }) => {
        if (type === 'save') {
            await saveImage(data);
        } else if (type === 'copy') {
            vscode.window.showInformationMessage('Image copied to clipboard');
        } else {
            vscode.window.showErrorMessage(`Solar Space: Unknown shutterAction "${type}"`);
        }
    });
    
    const selectionHandler = vscode.window.onDidChangeTextEditorSelection(_ => update());
    
    panel.onDidDispose(() => selectionHandler.dispose());
    
    update();
}

async function readHtml (htmlPath: string, panel: vscode.WebviewPanel): Promise<string> {
    const template = await readFile(htmlPath, 'utf-8');
    return template
    .replace(/%CSP_SOURCE%/gu, panel.webview.cspSource)
    .replace(
        /(src|href)="([^"]*)"/gu,
        (_, type, src) =>
            `${type}="${panel.webview.asWebviewUri(
            vscode.Uri.file(path.resolve(htmlPath, '..', src.replace('src', 'dist').replace('.ts', '.js')))
        )}"`
    );
}

export
function activate (context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('solarspace.shareWithImage', () => runCommand(context))
    );
}
