import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TaskSyncWebviewProvider } from './webview/webviewProvider';
import { registerTools } from './tools';
import { McpServerManager } from './mcp/mcpServer';
import { ContextManager } from './context';
import { RemoteUiServer, RemoteMessage } from './server/remoteUiServer';
import { registerPlanReviewTool } from './planReview';

let mcpServer: McpServerManager | undefined;
let webviewProvider: TaskSyncWebviewProvider | undefined;
let contextManager: ContextManager | undefined;
let remoteServer: RemoteUiServer | undefined;
let remoteStatusBarItem: vscode.StatusBarItem | undefined;

// Memoized result for external MCP client check (only checked once per activation)
let _hasExternalMcpClientsResult: boolean | undefined;

/**
 * Check if external MCP client configs exist (Kiro, Cursor, Antigravity)
 * This indicates user has external tools that need the MCP server
 * Result is memoized to avoid repeated file system reads
 * Uses async I/O to avoid blocking the extension host thread
 */
async function hasExternalMcpClientsAsync(): Promise<boolean> {
    // Return cached result if available
    if (_hasExternalMcpClientsResult !== undefined) {
        return _hasExternalMcpClientsResult;
    }

    const configPaths = [
        path.join(os.homedir(), '.kiro', 'settings', 'mcp.json'),
        path.join(os.homedir(), '.cursor', 'mcp.json'),
        path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json')
    ];

    for (const configPath of configPaths) {
        try {
            const content = await fs.promises.readFile(configPath, 'utf8');
            const config = JSON.parse(content);
            // Check if tasksync-chat is registered
            if (config.mcpServers?.['tasksync-chat']) {
                _hasExternalMcpClientsResult = true;
                return true;
            }
        } catch {
            // File doesn't exist or parse error - continue to next path
        }
    }
    _hasExternalMcpClientsResult = false;
    return false;
}

export function activate(context: vscode.ExtensionContext) {
    // Initialize context manager for #terminal, #problems features
    contextManager = new ContextManager();
    context.subscriptions.push({ dispose: () => contextManager?.dispose() });

    const provider = new TaskSyncWebviewProvider(context.extensionUri, context, contextManager);
    webviewProvider = provider;

    // Register the provider and add it to disposables for proper cleanup
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(TaskSyncWebviewProvider.viewType, provider),
        provider // Provider implements Disposable for cleanup
    );

    // Register VS Code LM Tools (always available for Copilot)
    registerTools(context, provider);

    // Register plan_review tool (opens a dedicated review panel)
    const planReviewDisposable = registerPlanReviewTool(context, provider);
    context.subscriptions.push(planReviewDisposable);

    // Inject instructions based on configured method
    handleInstructionInjection();

    // Listen for settings changes to toggle instruction injection
    const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('tasksync.instructionInjection') || e.affectsConfiguration('tasksync.instructionText')) {
            handleInstructionInjection();
        }
    });
    context.subscriptions.push(configWatcher);

    // Initialize MCP server manager (but don't start yet)
    mcpServer = new McpServerManager(provider, context.extensionUri);

    // Check if MCP should auto-start based on settings and external client configs
    // Deferred to avoid blocking activation with file I/O
    const config = vscode.workspace.getConfiguration('tasksync');
    const mcpEnabled = config.get<boolean>('mcpEnabled', false);
    const autoStartIfClients = config.get<boolean>('mcpAutoStartIfClients', true);

    // Start MCP server only if:
    // 1. Explicitly enabled in settings, OR
    // 2. Auto-start is enabled AND external clients are configured
    // Note: Check is deferred to avoid blocking extension activation with file I/O
    if (mcpEnabled) {
        // Explicitly enabled - start immediately without checking external clients
        mcpServer.start();
    } else if (autoStartIfClients) {
        // Defer the external client check to avoid blocking activation
        hasExternalMcpClientsAsync().then(hasClients => {
            if (hasClients && mcpServer) {
                mcpServer.start();
            }
        }).catch(err => {
            console.error('[TaskSync] Failed to check external MCP clients:', err);
        });
    }

    // Start MCP server command
    const startMcpCmd = vscode.commands.registerCommand('tasksync.startMcp', async () => {
        if (mcpServer && !mcpServer.isRunning()) {
            await mcpServer.start();
            vscode.window.showInformationMessage('TaskSync MCP Server started');
        } else if (mcpServer?.isRunning()) {
            vscode.window.showInformationMessage('TaskSync MCP Server is already running');
        }
    });

    // Restart MCP server command
    const restartMcpCmd = vscode.commands.registerCommand('tasksync.restartMcp', async () => {
        if (mcpServer) {
            await mcpServer.restart();
        }
    });

    // Show MCP configuration command
    const showMcpConfigCmd = vscode.commands.registerCommand('tasksync.showMcpConfig', async () => {
        const config = (mcpServer as any).getMcpConfig?.();
        if (!config) {
            vscode.window.showErrorMessage('MCP server not running');
            return;
        }

        const selected = await vscode.window.showQuickPick(
            [
                { label: 'Kiro', description: 'Kiro IDE', value: 'kiro' },
                { label: 'Cursor', description: 'Cursor Editor', value: 'cursor' },
                { label: 'Antigravity', description: 'Gemini CLI', value: 'antigravity' }
            ],
            { placeHolder: 'Select MCP client to configure' }
        );

        if (!selected) return;

        const cfg = config[selected.value];
        const configJson = JSON.stringify(cfg.config, null, 2);

        const message = `Add this to ${cfg.path}:\n\n${configJson}`;
        const action = await vscode.window.showInformationMessage(message, 'Copy to Clipboard', 'Open File');

        if (action === 'Copy to Clipboard') {
            await vscode.env.clipboard.writeText(configJson);
            vscode.window.showInformationMessage('Configuration copied to clipboard');
        } else if (action === 'Open File') {
            const uri = vscode.Uri.file(cfg.path);
            await vscode.commands.executeCommand('vscode.open', uri);
        }
    });

    // Open history modal command (triggered from view title bar)
    const openHistoryCmd = vscode.commands.registerCommand('tasksync.openHistory', () => {
        provider.openHistoryModal();
    });

    // Clear current session command (triggered from view title bar)
    const clearSessionCmd = vscode.commands.registerCommand('tasksync.clearCurrentSession', async () => {
        const result = await vscode.window.showWarningMessage(
            'Clear all tool calls from current session?',
            { modal: true },
            'Clear'
        );
        if (result === 'Clear') {
            provider.clearCurrentSession();
        }
    });

    // Open settings modal command (triggered from view title bar)
    const openSettingsCmd = vscode.commands.registerCommand('tasksync.openSettings', () => {
        provider.openSettingsModal();
    });

    // Open prompts modal command (triggered from view title bar)
    const openPromptsCmd = vscode.commands.registerCommand('tasksync.openPrompts', () => {
        provider.openPromptsModal();
    });

    // Initialize Remote Server
    remoteServer = new RemoteUiServer(context.extensionUri, context);
    context.subscriptions.push(remoteServer);
    
    // Connect remote server to webview provider for state sync
    // Match original API signature: onMessage(callback: (message, respond) => void)
    remoteServer.onMessage((message: RemoteMessage, respond) => {
        // Forward messages from remote clients to the webview provider
        // The provider will handle them the same as webview messages
        provider.handleRemoteMessage(message as any);
    });
    
    // Use getStateForRemote for original API compatibility
    remoteServer.onGetState(() => {
        // Return current state for new remote connections using public method
        return provider.getStateForRemote();
    });

    // Connect context manager to remote server for terminal history and problems
    remoteServer.onGetTerminalHistory(() => {
        return contextManager!.terminal.getRecentCommands();
    });

    remoteServer.onGetProblems(() => {
        return contextManager!.problems.getProblems();
    });

    // Subscribe to new terminal commands and broadcast to remote clients
    contextManager!.terminal.onCommand((command) => {
        if (remoteServer && remoteServer.isRunning()) {
            remoteServer.broadcast({
                type: 'terminalCommand',
                command: command
            } as RemoteMessage);
        }
    });

    // Set up broadcast callback: when webview state changes, broadcast to remote clients
    // Use setRemoteBroadcastCallback for original API compatibility
    provider.setRemoteBroadcastCallback((message) => {
        if (remoteServer && remoteServer.isRunning()) {
            remoteServer.broadcast(message as RemoteMessage);
        }
    });

    // Create status bar item for remote server
    remoteStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    remoteStatusBarItem.command = 'tasksync.showRemoteUrl';
    context.subscriptions.push(remoteStatusBarItem);

    // Function to update status bar based on server state
    function updateRemoteStatusBar() {
        if (!remoteStatusBarItem) return;
        
        if (remoteServer?.isRunning()) {
            const info = remoteServer.getConnectionInfo();
            const networkUrl = info.urls.find(u => !u.includes('localhost')) || info.urls[0];
            remoteStatusBarItem.text = '$(broadcast) TaskSync';
            remoteStatusBarItem.tooltip = new vscode.MarkdownString(
                `**TaskSync Remote Server**\n\n` +
                `**URL:** \`${networkUrl}\`\n\n` +
                `**PIN:** \`${info.pin}\`\n\n` +
                `_Click to copy_`
            );
            remoteStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            remoteStatusBarItem.show();
        } else {
            remoteStatusBarItem.hide();
        }
    }

    // Auto-start remote server if enabled
    const remoteConfig = vscode.workspace.getConfiguration('tasksync');
    const remoteEnabled = remoteConfig.get<boolean>('remoteEnabled', false);
    if (remoteEnabled) {
        remoteServer.start().then(() => {
            const info = remoteServer!.getConnectionInfo();
            vscode.window.showInformationMessage(
                `TaskSync Remote started: ${info.urls[1] || info.urls[0]} | PIN: ${info.pin}`
            );
            updateRemoteStatusBar();
        }).catch(err => {
            console.error('[TaskSync] Failed to start remote server:', err);
        });
    }

    // Toggle remote server command (triggered from view title bar)
    const toggleRemoteCmd = vscode.commands.registerCommand('tasksync.toggleRemoteServer', async () => {
        if (!remoteServer) return;
        
        if (remoteServer.isRunning()) {
            remoteServer.stop();
            updateRemoteStatusBar();
            vscode.window.showInformationMessage('TaskSync Remote Server stopped');
        } else {
            try {
                await remoteServer.start();
                updateRemoteStatusBar();
                const info = remoteServer.getConnectionInfo();
                const networkUrl = info.urls.find(u => !u.includes('localhost')) || info.urls[0];
                
                const action = await vscode.window.showInformationMessage(
                    `Remote Server started! URL: ${networkUrl} | PIN: ${info.pin}`,
                    'Copy URL', 'Copy PIN'
                );
                
                if (action === 'Copy URL') {
                    await vscode.env.clipboard.writeText(networkUrl);
                    vscode.window.showInformationMessage('URL copied to clipboard');
                } else if (action === 'Copy PIN') {
                    await vscode.env.clipboard.writeText(info.pin);
                    vscode.window.showInformationMessage('PIN copied to clipboard');
                }
            } catch (err) {
                vscode.window.showErrorMessage(`Failed to start remote server: ${err}`);
            }
        }
    });

    // Start remote server command
    const startRemoteCmd = vscode.commands.registerCommand('tasksync.startRemoteServer', async () => {
        if (!remoteServer) return;
        
        if (remoteServer.isRunning()) {
            vscode.window.showInformationMessage('Remote server is already running');
            return;
        }
        
        try {
            await remoteServer.start();
            updateRemoteStatusBar();
            const info = remoteServer.getConnectionInfo();
            vscode.window.showInformationMessage(
                `Remote Server started: ${info.urls[1] || info.urls[0]} | PIN: ${info.pin}`
            );
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to start remote server: ${err}`);
        }
    });

    // Stop remote server command
    const stopRemoteCmd = vscode.commands.registerCommand('tasksync.stopRemoteServer', () => {
        if (!remoteServer) return;
        
        if (!remoteServer.isRunning()) {
            vscode.window.showInformationMessage('Remote server is not running');
            return;
        }
        
        remoteServer.stop();
        updateRemoteStatusBar();
        vscode.window.showInformationMessage('Remote server stopped');
    });

    // Show remote URL command
    const showRemoteUrlCmd = vscode.commands.registerCommand('tasksync.showRemoteUrl', async () => {
        if (!remoteServer || !remoteServer.isRunning()) {
            vscode.window.showWarningMessage('Remote server is not running. Start it first.');
            return;
        }
        
        const info = remoteServer.getConnectionInfo();
        const networkUrl = info.urls.find(u => !u.includes('localhost')) || info.urls[0];
        
        const action = await vscode.window.showInformationMessage(
            `URL: ${networkUrl}\nPIN: ${info.pin}`,
            'Copy URL', 'Copy PIN', 'Copy Both'
        );
        
        if (action === 'Copy URL') {
            await vscode.env.clipboard.writeText(networkUrl);
        } else if (action === 'Copy PIN') {
            await vscode.env.clipboard.writeText(info.pin);
        } else if (action === 'Copy Both') {
            await vscode.env.clipboard.writeText(`URL: ${networkUrl}\nPIN: ${info.pin}`);
        }
    });

    context.subscriptions.push(
        startMcpCmd, restartMcpCmd, showMcpConfigCmd, 
        openHistoryCmd, clearSessionCmd, openSettingsCmd, openPromptsCmd,
        toggleRemoteCmd, startRemoteCmd, stopRemoteCmd, showRemoteUrlCmd,
        remoteServer
    );
}

const TASKSYNC_SECTION_START = '<!-- [TaskSync] START -->';
const TASKSYNC_SECTION_END = '<!-- [TaskSync] END -->';
const TASKSYNC_MARKER = '[TaskSync]';

/**
 * Handle instruction injection based on the selected method.
 * Supports: 'off', 'copilotInstructionsMd', 'codeGenerationSetting'
 */
async function handleInstructionInjection(): Promise<void> {
    const config = vscode.workspace.getConfiguration('tasksync');
    const method = config.get<string>('instructionInjection', 'off');

    // Migrate old global-level instructions if they exist
    migrateGlobalToWorkspaceInstructions();

    try {
        switch (method) {
            case 'copilotInstructionsMd':
                // Remove from codeGeneration.instructions if switching methods
                removeFromCodeGenSettings();
                await injectIntoCopilotInstructionsMd();
                break;
            case 'codeGenerationSetting':
                // Remove from copilot-instructions.md if switching methods
                await removeFromCopilotInstructionsMd();
                injectIntoCodeGenSettings();
                break;
            case 'off':
            default:
                // Remove from both locations
                removeFromCodeGenSettings();
                await removeFromCopilotInstructionsMd();
                break;
        }
    } catch (err) {
        console.error('[TaskSync] Failed to handle instruction injection:', err);
    }
}

/**
 * Get the instruction text from settings
 */
function getInstructionText(): string {
    const config = vscode.workspace.getConfiguration('tasksync');
    return config.get<string>('instructionText', '');
}

/**
 * Inject TaskSync instructions into .github/copilot-instructions.md
 * Prompts user for confirmation before creating/modifying the file.
 */
async function injectIntoCopilotInstructionsMd(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return;

    const instructionText = getInstructionText();
    if (!instructionText.trim()) return;

    const rootUri = workspaceFolders[0].uri;
    const githubDir = vscode.Uri.joinPath(rootUri, '.github');
    const filePath = vscode.Uri.joinPath(githubDir, 'copilot-instructions.md');

    const sectionContent = `\n\n${TASKSYNC_SECTION_START}\n${instructionText}\n${TASKSYNC_SECTION_END}`;

    try {
        // Check if file exists
        let existingContent = '';
        let fileExists = false;
        try {
            const fileData = await vscode.workspace.fs.readFile(filePath);
            existingContent = Buffer.from(fileData).toString('utf-8');
            fileExists = true;
        } catch {
            // File doesn't exist
        }

        // Check if TaskSync section already exists
        if (fileExists && existingContent.includes(TASKSYNC_SECTION_START)) {
            // Update existing section
            const startIdx = existingContent.indexOf(TASKSYNC_SECTION_START);
            const endIdx = existingContent.indexOf(TASKSYNC_SECTION_END);
            if (startIdx !== -1 && endIdx !== -1) {
                const currentSection = existingContent.substring(startIdx, endIdx + TASKSYNC_SECTION_END.length);
                const newSection = `${TASKSYNC_SECTION_START}\n${instructionText}\n${TASKSYNC_SECTION_END}`;
                if (currentSection !== newSection) {
                    const updatedContent = existingContent.substring(0, startIdx) + newSection + existingContent.substring(endIdx + TASKSYNC_SECTION_END.length);
                    await vscode.workspace.fs.writeFile(filePath, Buffer.from(updatedContent, 'utf-8'));
                    console.log('[TaskSync] Updated instructions in copilot-instructions.md');
                }
            }
            return;
        }

        // Need to create or append — ask user for confirmation
        const action = fileExists ? 'append to' : 'create';
        const confirm = await vscode.window.showInformationMessage(
            `TaskSync wants to ${action} .github/copilot-instructions.md with TaskSync tool instructions. This ensures the AI always calls ask_user and plan_review.`,
            'Allow',
            'Cancel'
        );

        if (confirm !== 'Allow') {
            // User declined — reset setting to 'off'
            const cfg = vscode.workspace.getConfiguration('tasksync');
            cfg.update('instructionInjection', 'off', vscode.ConfigurationTarget.Workspace);
            return;
        }

        if (fileExists) {
            // Append to existing file
            const updatedContent = existingContent + sectionContent;
            await vscode.workspace.fs.writeFile(filePath, Buffer.from(updatedContent, 'utf-8'));
            console.log('[TaskSync] Appended instructions to copilot-instructions.md');
        } else {
            // Create .github directory and file
            try { await vscode.workspace.fs.createDirectory(githubDir); } catch { /* exists */ }
            const newContent = `# Copilot Instructions\n${sectionContent}`;
            await vscode.workspace.fs.writeFile(filePath, Buffer.from(newContent, 'utf-8'));
            console.log('[TaskSync] Created copilot-instructions.md with instructions');
        }
    } catch (err) {
        console.error('[TaskSync] Failed to inject into copilot-instructions.md:', err);
    }
}

/**
 * Remove TaskSync section from .github/copilot-instructions.md
 */
async function removeFromCopilotInstructionsMd(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return;

    const filePath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.github', 'copilot-instructions.md');

    try {
        const fileData = await vscode.workspace.fs.readFile(filePath);
        const content = Buffer.from(fileData).toString('utf-8');

        if (!content.includes(TASKSYNC_SECTION_START)) return;

        const startIdx = content.indexOf(TASKSYNC_SECTION_START);
        const endIdx = content.indexOf(TASKSYNC_SECTION_END);
        if (startIdx === -1 || endIdx === -1) return;

        // Remove the section (including surrounding newlines)
        let before = content.substring(0, startIdx);
        let after = content.substring(endIdx + TASKSYNC_SECTION_END.length);

        // Clean up extra newlines
        while (before.endsWith('\n\n')) before = before.slice(0, -1);
        while (after.startsWith('\n\n')) after = after.substring(1);

        const updatedContent = (before + after).trim();

        if (updatedContent.length === 0 || updatedContent === '# Copilot Instructions') {
            // File would be empty or just the header we created — delete it
            await vscode.workspace.fs.delete(filePath);
            console.log('[TaskSync] Removed copilot-instructions.md (was only TaskSync content)');
        } else {
            await vscode.workspace.fs.writeFile(filePath, Buffer.from(updatedContent + '\n', 'utf-8'));
            console.log('[TaskSync] Removed TaskSync section from copilot-instructions.md');
        }
    } catch {
        // File doesn't exist, nothing to remove
    }
}

/**
 * Inject TaskSync instructions into workspace-level codeGeneration.instructions setting
 */
function injectIntoCodeGenSettings(): void {
    const instructionText = getInstructionText();
    if (!instructionText.trim()) return;

    // Create a concise version for the settings (settings warn about long instructions)
    const settingsText = `${TASKSYNC_MARKER} ${instructionText}`;

    const copilotConfig = vscode.workspace.getConfiguration('github.copilot.chat');
    const currentInstructions = copilotConfig.get<Array<{ text?: string; file?: string }>>('codeGeneration.instructions', []);

    const existingIndex = currentInstructions.findIndex(
        (inst) => inst.text && inst.text.includes(TASKSYNC_MARKER)
    );

    if (existingIndex === -1) {
        const updated = [...currentInstructions, { text: settingsText }];
        copilotConfig.update('codeGeneration.instructions', updated, vscode.ConfigurationTarget.Workspace)
            .then(
                () => console.log('[TaskSync] Workspace settings instructions injected'),
                (err: unknown) => console.error('[TaskSync] Failed to inject settings instructions:', err)
            );
    } else if (currentInstructions[existingIndex].text !== settingsText) {
        const updated = [...currentInstructions];
        updated[existingIndex] = { text: settingsText };
        copilotConfig.update('codeGeneration.instructions', updated, vscode.ConfigurationTarget.Workspace)
            .then(
                () => console.log('[TaskSync] Workspace settings instructions updated'),
                (err: unknown) => console.error('[TaskSync] Failed to update settings instructions:', err)
            );
    }
}

/**
 * Remove TaskSync instructions from codeGeneration.instructions setting
 */
function removeFromCodeGenSettings(): void {
    const copilotConfig = vscode.workspace.getConfiguration('github.copilot.chat');
    const currentInstructions = copilotConfig.get<Array<{ text?: string; file?: string }>>('codeGeneration.instructions', []);

    const filtered = currentInstructions.filter(
        (inst) => !(inst.text && inst.text.includes(TASKSYNC_MARKER))
    );

    if (filtered.length !== currentInstructions.length) {
        const newValue = filtered.length > 0 ? filtered : undefined;
        copilotConfig.update('codeGeneration.instructions', newValue, vscode.ConfigurationTarget.Workspace)
            .then(
                () => console.log('[TaskSync] Removed settings instructions'),
                (err: unknown) => console.error('[TaskSync] Failed to remove settings instructions:', err)
            );
    }
}

/**
 * One-time migration: remove old Global-level TaskSync instructions
 * (from previous version that used ConfigurationTarget.Global)
 */
function migrateGlobalToWorkspaceInstructions(): void {
    const copilotConfig = vscode.workspace.getConfiguration('github.copilot.chat');

    const globalInspected = copilotConfig.inspect<Array<{ text?: string; file?: string }>>('codeGeneration.instructions');
    const globalInstructions = globalInspected?.globalValue;

    if (globalInstructions && globalInstructions.some(inst => inst.text && inst.text.includes(TASKSYNC_MARKER))) {
        const filtered = globalInstructions.filter(
            (inst) => !(inst.text && inst.text.includes(TASKSYNC_MARKER))
        );
        const newValue = filtered.length > 0 ? filtered : undefined;
        copilotConfig.update('codeGeneration.instructions', newValue, vscode.ConfigurationTarget.Global)
            .then(
                () => console.log('[TaskSync] Migrated: removed old global-level instructions'),
                (err: unknown) => console.error('[TaskSync] Migration failed:', err)
            );
    }
}

export async function deactivate() {
    // Save current tool call history to persisted history before deactivating
    if (webviewProvider) {
        webviewProvider.saveCurrentSessionToHistory();
        webviewProvider = undefined;
    }

    // Stop remote server
    if (remoteServer) {
        remoteServer.dispose();
        remoteServer = undefined;
    }

    if (mcpServer) {
        await mcpServer.dispose();
        mcpServer = undefined;
    }
}
