// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GitExtension } from './git';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "solarspace" is now active!');

	context.subscriptions.push(vscode.commands.registerCommand('solarspace.share', async () => {
		// First check if the user has pending changes that would not be shared
		let hasPendingChanges = false;
		try {
			hasPendingChanges = await pendingChanges();
		} catch (error) {
			if (error instanceof Error) {
				vscode.window.showErrorMessage(error.message);
			} else {
				vscode.window.showErrorMessage('Un unexpected error occurred while checking for pending changes');
			}
			return;
		}
		if (hasPendingChanges) {
			const result = await vscode.window.showWarningMessage(
				'You have uncommitted or unpushed changes. These will not be shared unless you push them first. Do you want to continue?',
				'Shary anyway',
				'Cancel',
			);
			if (result == 'Cancel') {
				return;
			}
		}
		// Copy the Solar Space URL to the clipboard
		const clipboard = vscode.env.clipboard;
		const url = await solarSpaceUrl();
		if (!url) {
			vscode.window.showErrorMessage('Failed to create Solar Space URL');
			return;
		}
		await clipboard.writeText(url);
		vscode.window.showInformationMessage(`Solar Space URL copied to clipboard`);
	}));

	const button = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left,
		10000000,
	);
	button.text = '$(link-external) Share Space';
	button.command = 'solarspace.share';
	button.show();
	context.subscriptions.push(button);
}

// This method is called when your extension is deactivated
export function deactivate() {}

async function pendingChanges() : Promise<boolean> {
	const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
	if (!gitExtension) {
		throw new Error('Git extension not found');
	}
	const git = gitExtension.exports.getAPI(1);
	if (!git) {
		throw new Error('Git API not found');
	}
	// Find the root repository (the one with the fewest path segments)
	const repos = git.repositories;
	if (repos.length === 0) {
		throw new Error('No repositories found');
	}
	const rootRepo = repos.sort((a, b) => {
		const aPath = a.rootUri.path.split('/').length;
		const bPath = b.rootUri.path.split('/').length;
		return aPath - bPath;
	})[0];
	if (rootRepo.state.workingTreeChanges.length > 0 || rootRepo.state.indexChanges.length > 0) {
		return true;
	}
	return false;
}


async function githubRepo () : Promise<string> {
	const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
	if (!gitExtension) {
		vscode.window.showErrorMessage('Git extension not found');
		return '';	
	}
	const git = gitExtension.exports.getAPI(1);
	if (!git) {
		vscode.window.showErrorMessage('Git API not found');
		return '';
	}
	// Find the root repository (the one with the fewest path segments)
	const repos = git.repositories;
	if (repos.length === 0) {
		vscode.window.showErrorMessage('No repositories found');
		return '';
	}
	const rootRepo = repos.sort((a, b) => {
		const aPath = a.rootUri.path.split('/').length;
		const bPath = b.rootUri.path.split('/').length;
		return aPath - bPath;
	})[0];

	const remote = rootRepo.state.remotes.find(r => r.name === 'origin');
	if (remote) {
		const url = remote.fetchUrl;
		if (url) {
			return url;
		}
	}
	vscode.window.showErrorMessage('No remote repository found');
	return '';
}

async function solarSpaceUrl() : Promise<string> {
	const repo = await githubRepo();
	if (!repo) {
		vscode.window.showErrorMessage('No repository found');
		return '';
	}
	// Ensure the URL matches either
	//  git@github.com:{owner}/{repo}.git or
	//  https://github.com/{owner}/{repo}
	// If not, show an error message
	// Otherwise rewrite URL to: https://solarspace.dev/github/{owner}/{repo}

	const regex = /(?:git@github\.com:|https:\/\/github\.com\/)([^\/]+)\/([^\/]+?)(?:\.git)?$/;
	const match = repo.match(regex);
	if (!match) {
		vscode.window.showErrorMessage('Invalid repository URL');
		return '';
	}
	const owner = match[1];
	const repoName = match[2];
	const url = `https://solarspace.dev/github/${owner}/${repoName}`;
	return url;
}