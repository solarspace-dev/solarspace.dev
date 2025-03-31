// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "solarspace" is now active!');

	context.subscriptions.push(vscode.commands.registerCommand('solarspace.share', () => {
		vscode.window.showInformationMessage('Hello World from Solar Code!');
	}));

	const button = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Left,
		100,
	);
	button.text = '$(link-external) Copy solarspace.dev Link';
	button.command = 'solarspace.share';
	button.show();
	context.subscriptions.push(button);
}

// This method is called when your extension is deactivated
export function deactivate() {}
