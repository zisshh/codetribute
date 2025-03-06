const assert = require('assert');
const vscode = require('vscode');
const myExtension = require('../extension');

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Activate Extension', async () => {
        const extension = vscode.extensions.getExtension('your.extension.id');
        if (!extension) {
            assert.fail('Extension not found');
        } else {
            await extension.activate();
            assert.ok(extension.isActive, 'Extension is not active');
        }
    });

    test('Codetribute', async () => {
        const createRepoCommand = vscode.commands.executeCommand('codetribute.createRepo');
        assert.ok(createRepoCommand, 'Codetribute command not found');
    });
});