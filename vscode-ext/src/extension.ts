import * as vscode from 'vscode';
import { API, GitExtension, Remote, Repository } from './git';
import * as path from 'path';
import { homedir } from 'os';
import { readFile, writeFile } from 'fs/promises';

let lastUsedImageUri = vscode.Uri.file(path.resolve(homedir(), 'snapshot.png'));

interface ViewState {
	text: string;
	language: string;
	url?: string;
	errors: ErrorViewState[];
}

interface ErrorViewState {
	severityClass: 'error' | 'warning';
	message: string;
	action?: WebViewAction;
	actionClass?: string;
}

export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "solarspace" is now active!');
	registerShareCommand(context);
	createStatusBarButton(context);
}

export function deactivate() {}

type WebViewAction = 'Webview Ready' | 'Reload' | 'Copy URL' | 'Copy Snapshot' | 'Copied Snapshot' | 'Copied Link' | 'Save Snapshot' | 'Commit' | 'Push' | 'Publish Branch' | 'Initialize Repository';

function registerShareCommand(context: vscode.ExtensionContext) {
	const shareCommand = vscode.commands.registerCommand('solarspace.share', async () => {
		try {
			const panel = await createPanel(context);
			const update = async (): Promise<ViewState> => {
				const state = await getViewState();
				panel.webview.postMessage({ type: 'update', ...state });
				return state;
			};
			panel.webview.onDidReceiveMessage(async ({ type, data }: { type: WebViewAction; data: string }) => {
				if (type === 'Webview Ready') {
					await update();
				} else if (type === 'Reload') {
					await update();
					await vscode.window.showInformationMessage('Refreshed View');
				} else if (type === 'Copy Snapshot') {
					// Noop
					// This is handled in the webview
				} else if (type === 'Copy URL') {
					// Noop
					// This is handled in the webview
				} else if (type === 'Save Snapshot') {
					if (data) {
						await saveImage(data);
					}
				} else if (type === 'Copied Snapshot') {
					// The copy action is handled in the webview
					// We just show the notification message 
					vscode.window.showInformationMessage('Image copied to clipboard');
				} else if (type === 'Copied Link') {
					// The copy action is handled in the webview
					// We just show the notification message 
					vscode.window.showInformationMessage('Solar Space URL copied to clipboard');
				} else if (type === 'Initialize Repository') {
					await vscode.commands.executeCommand('git.init');
					await update();
				} else if (type === 'Commit') {
					await vscode.commands.executeCommand('git.commit');
					await update();
				} else if (type === 'Push') {
					await vscode.commands.executeCommand('git.push');
					await update();
				} else if (type === 'Publish Branch') {
					await vscode.commands.executeCommand('git.publish');
					await update();
				} else {
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
		} catch (error) {
			handleError(error);
		}
	});

	context.subscriptions.push(shareCommand);
}

function createStatusBarButton(context: vscode.ExtensionContext) {
	const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10000000);
	button.text = '$(link-external) Share Space';
	button.command = 'solarspace.share';
	button.show();
	context.subscriptions.push(button);
}

async function getWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
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

async function getGitRepository(git: API, workspaceFolder: vscode.WorkspaceFolder): Promise<Repository | undefined> {
	const repository = git.getRepository(workspaceFolder.uri);
	return repository ?? undefined;
}

async function getRemoteOrigin(repository: Repository): Promise<Remote | undefined> {
	const remote = repository.state.remotes.find((r: Remote) => r.name === 'origin');
	return remote ?? undefined;
}

function gitApi() : API | undefined {
	const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
	if (!gitExtension) {
		return undefined;
	}
	const git = gitExtension.exports.getAPI(1);
	if (!git) {
		return undefined;
	}
	return git;
}

async function hasUnpushedChanges(repository: Repository): Promise<boolean> {
	const hasChanges = (repository.state.HEAD?.ahead ?? 0) > 0;
	return hasChanges;
}

async function hasWorkingTreeChanges(repository: Repository): Promise<boolean> {
	const hasChanges = repository.state.workingTreeChanges.length > 0;
	return hasChanges;
}

function getRootRepository(git: API, workspaceFolder: vscode.WorkspaceFolder): Repository | undefined {
	const repository = git.getRepository(workspaceFolder.uri);
	return repository || git.repositories.find(repo => repo.rootUri.fsPath === workspaceFolder.uri.fsPath);
}

async function getGithubRepoUrl(git: API, workspaceFolder: vscode.WorkspaceFolder): Promise<string | undefined> {
	const rootRepo = getRootRepository(git, workspaceFolder);

	if (!rootRepo) {
		vscode.window.showErrorMessage('No repositories found');
		return undefined;
	}

	const remote = rootRepo.state.remotes.find((r: Remote) => r.name === 'origin');
	if (remote?.fetchUrl) {
		return remote.fetchUrl;
	}

	vscode.window.showErrorMessage('No remote repository found');
	return undefined;
}

async function generateSolarSpaceUrl(git: API, workspaceFolder: vscode.WorkspaceFolder): Promise<string | undefined> {
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
	return `https://solarspace.dev/github/${owner}/${repoName}`;
}

async function getViewState(): Promise<ViewState> {
	let url : string | undefined;
	const errors: ErrorViewState[] = [];
    const editor = vscode.window.activeTextEditor || vscode.window.visibleTextEditors[0];
    const selection = editor?.selection;

	const git = gitApi();
	if (!git) {
		errors.push({
			severityClass: 'error',
			message: 'Git extension not found. Please install the Git extension to use Solar Space.'
		});
		return { text: '', language: 'plaintext', url, errors };
	}

	const workspaceFolder = await getWorkspaceFolder();
	if (!workspaceFolder) {
		errors.push({
			severityClass: 'error',
			message: 'No workspace folder selected.'
		});
		return { text: '', language: 'plaintext', url, errors };
	}

	const repository = await getGitRepository(git, workspaceFolder);
	if (!repository) {
		errors.push({
			severityClass: 'error',
			message: 'No Git repository found in the workspace folder',
			action: 'Initialize Repository',
			actionClass: 'codicon-repo'
		});
		return { text: '', language: 'plaintext', url, errors };
	}

	const remote = await getRemoteOrigin(repository);
	if (!remote) {
		errors.push({
			severityClass: 'error',
			message: 'No linked repository found. Please link the remote origin to GitHub.',
			action: 'Publish Branch',
			actionClass: 'codicon-repo'
		});
		return { text: '', language: 'plaintext', url, errors };
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

    const state: ViewState = {
        text: editor?.document.getText(selection) || editor?.document.getText() || '',
        language: editor?.document.languageId ?? 'plaintext',
		url: url,
		errors: errors
    };
    return state;
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
            localResourceRoots: [
				vscode.Uri.file(context.extensionPath),
				vscode.Uri.file(path.join(context.extensionPath, 'dist')),
				vscode.Uri.file(path.join(context.extensionPath, 'dist', 'webview')),
			]
        }
    );
    panel.webview.html = await readHtml(
		context,
        path.resolve(context.extensionPath, 'dist/webview/index.html'),
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

async function readHtml(context: vscode.ExtensionContext, htmlPath: string, panel: vscode.WebviewPanel): Promise<string> {
    const template = await readFile(htmlPath, 'utf-8');
	const mainCss = panel.webview.asWebviewUri(vscode.Uri.file(path.resolve(context.extensionPath, 'dist/webview/style.css')));
const mainJs = panel.webview.asWebviewUri(vscode.Uri.file(path.resolve(context.extensionPath, 'dist/webview/index.js')));
    const html = template
        .replace(/%CSP_SOURCE%/gu, panel.webview.cspSource)
        .replace('./style.css', mainCss.toString())
        .replace('./index.js', mainJs.toString());
    return html;
}

function handleError(error: unknown) {
	if (error instanceof Error) {
		vscode.window.showErrorMessage(error.message);
	} else {
		vscode.window.showErrorMessage('An unexpected error occurred');
	}
}
