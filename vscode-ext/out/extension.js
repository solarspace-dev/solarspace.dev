"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const os_1 = require("os");
const promises_1 = require("fs/promises");
let lastUsedImageUri = vscode.Uri.file(path.resolve((0, os_1.homedir)(), 'snapshot.png'));
async function activate(context) {
    console.log('Congratulations, your extension "solarspace" is now active!');
    registerShareCommand(context);
    createStatusBarButton(context);
}
function deactivate() { }
function registerShareCommand(context) {
    const shareCommand = vscode.commands.registerCommand('solarspace.share', async () => {
        try {
            const panel = await createPanel(context);
            const update = async () => {
                const state = await getViewState();
                panel.webview.postMessage({ type: 'update', ...state });
                return state;
            };
            panel.webview.onDidReceiveMessage(async ({ type, data }) => {
                if (type === 'Webview Ready') {
                    await update();
                }
                else if (type === 'Reload') {
                    await update();
                    await vscode.window.showInformationMessage('Refreshed View');
                }
                else if (type === 'Copy Snapshot') {
                    // Noop
                    // This is handled in the webview
                }
                else if (type === 'Copy URL') {
                    // Noop
                    // This is handled in the webview
                }
                else if (type === 'Save Snapshot') {
                    if (data) {
                        await saveImage(data);
                    }
                }
                else if (type === 'Copied Snapshot') {
                    // The copy action is handled in the webview
                    // We just show the notification message 
                    vscode.window.showInformationMessage('Image copied to clipboard');
                }
                else if (type === 'Copied Link') {
                    // The copy action is handled in the webview
                    // We just show the notification message 
                    vscode.window.showInformationMessage('Solar Space URL copied to clipboard');
                }
                else if (type === 'Initialize Repository') {
                    await vscode.commands.executeCommand('git.init');
                    await update();
                }
                else if (type === 'Commit') {
                    await vscode.commands.executeCommand('git.commit');
                    await update();
                }
                else if (type === 'Push') {
                    await vscode.commands.executeCommand('git.push');
                    await update();
                }
                else if (type === 'Publish Branch') {
                    await vscode.commands.executeCommand('git.publish');
                    await update();
                }
                else {
                    vscode.window.showErrorMessage(`Solar Space: Unknown action "${type}"`);
                }
            });
            const selectionHandler = vscode.window.onDidChangeTextEditorSelection(_ => update());
            panel.onDidDispose(() => selectionHandler.dispose());
            const state = await update();
            if (state.url) {
                await vscode.env.clipboard.writeText(state.url);
                vscode.window.showInformationMessage(`Solar Space URL copied to clipboard`);
            }
        }
        catch (error) {
            handleError(error);
        }
    });
    context.subscriptions.push(shareCommand);
}
function createStatusBarButton(context) {
    const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10000000);
    button.text = '$(link-external) Share Space';
    button.command = 'solarspace.share';
    button.show();
    context.subscriptions.push(button);
}
async function getWorkspaceFolder() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }
    if (workspaceFolders.length === 1) {
        return workspaceFolders[0];
    }
    const selectedFolder = await vscode.window.showWorkspaceFolderPick({
        placeHolder: 'Select a workspace folder to share',
    });
    if (!selectedFolder) {
        return undefined;
    }
    return selectedFolder;
}
async function getGitRepository(git, workspaceFolder) {
    const repository = git.getRepository(workspaceFolder.uri);
    return repository ?? undefined;
}
async function getRemoteOrigin(repository) {
    const remote = repository.state.remotes.find((r) => r.name === 'origin');
    return remote ?? undefined;
}
function gitApi() {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
        return undefined;
    }
    const git = gitExtension.exports.getAPI(1);
    if (!git) {
        return undefined;
    }
    return git;
}
async function hasUnpushedChanges(repository) {
    const hasChanges = (repository.state.HEAD?.ahead ?? 0) > 0;
    return hasChanges;
}
async function hasWorkingTreeChanges(repository) {
    const hasChanges = repository.state.workingTreeChanges.length > 0;
    return hasChanges;
}
function getRootRepository(git, workspaceFolder) {
    const repository = git.getRepository(workspaceFolder.uri);
    return repository || git.repositories.find(repo => repo.rootUri.fsPath === workspaceFolder.uri.fsPath);
}
async function getGithubRepoUrl(git, workspaceFolder) {
    const rootRepo = getRootRepository(git, workspaceFolder);
    if (!rootRepo) {
        vscode.window.showErrorMessage('No repositories found');
        return undefined;
    }
    const remote = rootRepo.state.remotes.find((r) => r.name === 'origin');
    if (remote?.fetchUrl) {
        return remote.fetchUrl;
    }
    vscode.window.showErrorMessage('No remote repository found');
    return undefined;
}
async function generateSolarSpaceUrl(git, workspaceFolder) {
    const repoUrl = await getGithubRepoUrl(git, workspaceFolder);
    if (!repoUrl) {
        return undefined;
    }
    const match = repoUrl.match(/(?:git@github\.com:|https:\/\/github\.com\/)([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (!match) {
        vscode.window.showErrorMessage('Invalid repository URL');
        return undefined;
    }
    const [_, owner, repoName] = match;
    return `https://codespaces.new/${owner}/${repoName}`;
}
async function getViewState() {
    let url;
    const errors = [];
    const editor = vscode.window.activeTextEditor || vscode.window.visibleTextEditors[0];
    const selection = editor?.selection;
    const text = editor?.document.getText(selection) || editor?.document.getText() || '';
    const language = editor?.document.languageId ?? 'plaintext';
    const state = { text, language, url, errors };
    const git = gitApi();
    if (!git) {
        errors.push({
            severityClass: 'error',
            message: 'Git extension not found. Please install the Git extension to use Solar Space.'
        });
        return state;
    }
    const workspaceFolder = await getWorkspaceFolder();
    if (!workspaceFolder) {
        errors.push({
            severityClass: 'error',
            message: 'No workspace folder selected.'
        });
        return state;
    }
    const repository = await getGitRepository(git, workspaceFolder);
    if (!repository) {
        errors.push({
            severityClass: 'error',
            message: 'No Git repository found in the workspace folder',
            action: 'Initialize Repository',
            actionClass: 'codicon-repo'
        });
        return state;
    }
    const remote = await getRemoteOrigin(repository);
    if (!remote) {
        errors.push({
            severityClass: 'error',
            message: 'No linked repository found. Please link the remote origin to GitHub.',
            action: 'Publish Branch',
            actionClass: 'codicon-cloud-upload'
        });
        return state;
    }
    const hasWorkingTreeChanges_ = await hasWorkingTreeChanges(repository);
    if (hasWorkingTreeChanges_) {
        errors.push({
            severityClass: 'warning',
            message: 'You have uncommitted changes. These will not be shared unless you commit and push them first.',
            action: 'Commit',
            actionClass: 'codicon-check'
        });
    }
    const hasUnpushedChanges_ = await hasUnpushedChanges(repository);
    if (hasUnpushedChanges_) {
        errors.push({
            severityClass: 'warning',
            message: 'You have unpushed changes. These will not be shared unless you push them first.',
            action: 'Push',
            actionClass: 'codicon-cloud-upload'
        });
    }
    url = await generateSolarSpaceUrl(git, workspaceFolder);
    if (!url) {
        errors.push({
            severityClass: 'error',
            message: 'Failed to generate Solar Space URL.'
        });
    }
    state.url = url;
    return state;
}
async function createPanel(context) {
    const panel = vscode.window.createWebviewPanel('solarspace', 'Share Solar Space', {
        viewColumn: vscode.ViewColumn.Beside,
        preserveFocus: true
    }, {
        enableScripts: true,
        localResourceRoots: [
            vscode.Uri.file(context.extensionPath),
            vscode.Uri.file(path.join(context.extensionPath, 'dist')),
            vscode.Uri.file(path.join(context.extensionPath, 'dist', 'webview')),
        ]
    });
    panel.webview.html = await readHtml(context, path.resolve(context.extensionPath, 'dist/webview/index.html'), panel);
    return panel;
}
async function saveImage(data) {
    const uri = await vscode.window.showSaveDialog({
        filters: { Images: ['png'] },
        defaultUri: lastUsedImageUri
    });
    if (uri) {
        lastUsedImageUri = uri;
        await (0, promises_1.writeFile)(uri.fsPath, Buffer.from(data, 'base64'));
    }
}
async function readHtml(context, htmlPath, panel) {
    const template = await (0, promises_1.readFile)(htmlPath, 'utf-8');
    const mainCss = panel.webview.asWebviewUri(vscode.Uri.file(path.resolve(context.extensionPath, 'dist/webview/style.css')));
    const mainJs = panel.webview.asWebviewUri(vscode.Uri.file(path.resolve(context.extensionPath, 'dist/webview/index.js')));
    const html = template
        .replace(/%CSP_SOURCE%/gu, panel.webview.cspSource)
        .replace('./style.css', mainCss.toString())
        .replace('./index.js', mainJs.toString());
    return html;
}
function handleError(error) {
    if (error instanceof Error) {
        vscode.window.showErrorMessage(error.message);
    }
    else {
        vscode.window.showErrorMessage('An unexpected error occurred');
    }
}
//# sourceMappingURL=extension.js.map