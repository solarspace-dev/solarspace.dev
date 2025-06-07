import * as vscode from 'vscode';
import { API, GitExtension, Remote, Repository } from './git';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "solarspace" is now active!');

	registerShareCommand(context);
	createStatusBarButton(context);
}

export function deactivate() {}

function registerShareCommand(context: vscode.ExtensionContext) {
	const shareCommand = vscode.commands.registerCommand('solarspace.share', async () => {
		try {
			const workspaceFolder = await getWorkspaceFolder();

			await ensureHasLinkedRepo(workspaceFolder);
			await ensureNoPendingChanges(workspaceFolder);

			const url = await generateSolarSpaceUrl(workspaceFolder);
			if (!url) {
				vscode.window.showErrorMessage('Failed to create Solar Space URL');
				return;
			}

			await vscode.env.clipboard.writeText(url);
			vscode.window.showInformationMessage(`Solar Space URL copied to clipboard`);
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

async function ensureNoPendingChanges(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
	const hasPendingChanges = await checkPendingChanges(workspaceFolder);
	if (hasPendingChanges) {
		const result = await vscode.window.showWarningMessage(
			'You have uncommitted or unpushed changes. These will not be shared unless you push them first. Do you want to continue?',
			'Copy link anyway',
			'Cancel'
		);

		if (result === 'Cancel') {
			throw new Error('Operation canceled by user');
		}
	}
}

async function getWorkspaceFolder(): Promise<vscode.WorkspaceFolder> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders || workspaceFolders.length === 0) {
		throw new Error('No workspace folder found. Please open a folder first.');
	}
	if (workspaceFolders.length === 1) {
		return workspaceFolders[0];
	}
	const selectedFolder = await vscode.window.showWorkspaceFolderPick({
		placeHolder: 'Select a workspace folder to share',
	});
	if (!selectedFolder) {
		throw new Error('No workspace folder selected. Please select a folder to share.');
	}
	return selectedFolder;
}

async function ensureHasLinkedRepo(workspaceFolder: vscode.WorkspaceFolder, tries = 2): Promise<void> {
	// We are making two tries here because the git.publish command must be executed twice
	// On the first call, the command asks the user for the GitHub credentials
	// On the second call the command asks the user for the repository name
	// If the user does not provide input, the command will fail
	if (tries <= 0) {
		throw new Error('No linked repository found after multiple attempts');
	}
	const rootRepo = getRootRepository(workspaceFolder);
	if (!rootRepo) {
		throw new Error('No root repository found. Please initialize a Git repository in the workspace folder.');
	}
	if (!rootRepo.state.remotes.some((r: Remote) => r.name === 'origin')) {
		await vscode.commands.executeCommand('git.publish', rootRepo);
		await ensureHasLinkedRepo(workspaceFolder, tries - 1);
	}
}

function gitApi() : API {
	const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
	if (!gitExtension) {
		throw new Error('Git extension not found');
	}

	const git = gitExtension.exports.getAPI(1);
	if (!git) {
		throw new Error('Git API not found');
	}

	return git;
}

async function checkPendingChanges(workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
	const rootRepo = getRootRepository(workspaceFolder);

	if (!rootRepo) {
		throw new Error('No repositories found');
	}

	const hasChanges =
		rootRepo.state.workingTreeChanges.length > 0 ||
		(rootRepo.state.HEAD?.ahead ?? 0) > 0;

	return hasChanges;
}

function getRootRepository(workspaceFolder: vscode.WorkspaceFolder): Repository | undefined {
	const git = gitApi();
	const repository = git.getRepository(workspaceFolder.uri);
	return repository || git.repositories.find(repo => repo.rootUri.fsPath === workspaceFolder.uri.fsPath);
}

async function getGithubRepoUrl(workspaceFolder: vscode.WorkspaceFolder): Promise<string | undefined> {
	const rootRepo = getRootRepository(workspaceFolder);

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

async function generateSolarSpaceUrl(workspaceFolder: vscode.WorkspaceFolder): Promise<string | false> {
	const repoUrl = await getGithubRepoUrl(workspaceFolder);
	if (!repoUrl) {
		return false;
	}

	const match = repoUrl.match(/(?:git@github\.com:|https:\/\/github\.com\/)([^\/]+)\/([^\/]+?)(?:\.git)?$/);
	if (!match) {
		vscode.window.showErrorMessage('Invalid repository URL');
		return false;
	}

	const [_, owner, repoName] = match;
	return `https://solarspace.dev/github/${owner}/${repoName}`;
}

function handleError(error: unknown) {
	if (error instanceof Error) {
		vscode.window.showErrorMessage(error.message);
	} else {
		vscode.window.showErrorMessage('An unexpected error occurred');
	}
}
