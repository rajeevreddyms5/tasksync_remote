import * as vscode from 'vscode';
import { PlanReviewPanel } from './planReviewPanel';
import { PlanReviewInput, PlanReviewToolResult, PlanReviewOptions } from './types';
import { TaskSyncWebviewProvider } from '../webview/webviewProvider';

/**
 * Unique ID generator for plan reviews
 */
function generateReviewId(): string {
    return `pr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Core logic for plan review.
 * Opens a dedicated webview panel where the user can review the plan,
 * add comments, and approve or request changes.
 */
export async function planReview(
    params: PlanReviewInput,
    extensionUri: vscode.Uri,
    token: vscode.CancellationToken,
    webviewProvider?: TaskSyncWebviewProvider
): Promise<PlanReviewToolResult> {
    // Check if already cancelled
    if (token.isCancellationRequested) {
        return { status: 'cancelled', requiredRevisions: [], reviewId: '' };
    }

    const reviewId = generateReviewId();
    const plan = params.plan;
    const title = params.title || 'Plan Review';

    // Set up cancellation handling
    const cancellationDisposable = token.onCancellationRequested(() => {
        console.log('[TaskSync] planReview cancelled by agent, closing:', reviewId);
        PlanReviewPanel.closeIfOpen(reviewId);
    });

    try {
        const options: PlanReviewOptions = {
            plan,
            title,
            readOnly: false,
            existingComments: [],
            interactionId: reviewId
        };

        // Broadcast plan review pending to remote clients
        if (webviewProvider) {
            webviewProvider.broadcastPlanReview(reviewId, title, plan);
        }

        // Show the plan review panel and wait for user action
        const result = await PlanReviewPanel.showWithOptions(extensionUri, options);

        // Map panel action to tool result status
        const status: PlanReviewToolResult['status'] = [
            'approved',
            'approvedWithComments',
            'recreateWithChanges',
            'cancelled'
        ].includes(result.action)
            ? result.action as PlanReviewToolResult['status']
            : 'cancelled';

        const toolResult: PlanReviewToolResult = {
            status,
            requiredRevisions: result.requiredRevisions,
            reviewId
        };

        // Record plan review to session history
        if (webviewProvider) {
            webviewProvider.recordPlanReview(reviewId, title, status, plan, result.requiredRevisions);
        }

        // Broadcast completion to remote clients
        if (webviewProvider) {
            webviewProvider.broadcastPlanReviewCompleted(reviewId, status);
        }

        return toolResult;
    } catch (error) {
        console.error('[TaskSync] Error showing plan review panel:', error);
        return {
            status: 'cancelled',
            requiredRevisions: [],
            reviewId
        };
    } finally {
        cancellationDisposable.dispose();
    }
}

/**
 * Register the plan_review tool as a VS Code Language Model Tool
 */
export function registerPlanReviewTool(
    context: vscode.ExtensionContext,
    webviewProvider?: TaskSyncWebviewProvider
): vscode.Disposable {
    const planReviewTool = vscode.lm.registerTool('plan_review', {
        async invoke(
            options: vscode.LanguageModelToolInvocationOptions<PlanReviewInput>,
            token: vscode.CancellationToken
        ) {
            const params = options.input;

            // Validate input
            if (!params || !params.plan || typeof params.plan !== 'string' || params.plan.trim().length === 0) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({
                        status: 'cancelled',
                        requiredRevisions: [],
                        reviewId: '',
                        error: 'Validation error: plan content is required and cannot be empty'
                    }))
                ]);
            }

            try {
                const result = await planReview(
                    {
                        plan: params.plan,
                        title: params.title
                    },
                    context.extensionUri,
                    token,
                    webviewProvider
                );

                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(result))
                ]);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({
                        status: 'cancelled',
                        requiredRevisions: [],
                        reviewId: '',
                        error: message
                    }))
                ]);
            }
        }
    });

    return planReviewTool;
}
