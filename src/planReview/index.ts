import * as vscode from 'vscode';
import { PlanReviewInput, PlanReviewToolResult, PlanReviewPanelResult } from './types';
import { TaskSyncWebviewProvider } from '../webview/webviewProvider';

/**
 * Unique ID generator for plan reviews
 */
function generateReviewId(): string {
    return `pr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Pending plan review promises — resolved when the sidebar/remote modal submits a response.
 * This replaces the old PlanReviewPanel approach which opened a separate editor tab.
 */
const pendingReviews: Map<string, (result: PlanReviewPanelResult) => void> = new Map();

/**
 * Resolve a pending plan review from the sidebar or remote client.
 * Called by webviewProvider._handlePlanReviewResponse().
 */
export function resolvePlanReview(reviewId: string, result: PlanReviewPanelResult): boolean {
    const resolve = pendingReviews.get(reviewId);
    if (resolve) {
        resolve(result);
        pendingReviews.delete(reviewId);
        return true;
    }
    return false;
}

/**
 * Core logic for plan review.
 * Broadcasts plan to sidebar/remote modal and waits for user action.
 * No dedicated editor panel is opened — the sidebar modal is the primary UI.
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
        console.log('[TaskSync] planReview cancelled by agent:', reviewId);
        // Clean up pending review
        const resolve = pendingReviews.get(reviewId);
        if (resolve) {
            resolve({ action: 'closed', requiredRevisions: [] });
            pendingReviews.delete(reviewId);
        }
        // Broadcast completion to dismiss remote modals
        if (webviewProvider) {
            webviewProvider.broadcastPlanReviewCompleted(reviewId, 'cancelled');
        }
    });

    try {
        // Broadcast plan review to sidebar and remote clients
        if (webviewProvider) {
            webviewProvider.broadcastPlanReview(reviewId, title, plan);
        }

        // Wait for response from sidebar/remote modal
        const result = await new Promise<PlanReviewPanelResult>((resolve) => {
            pendingReviews.set(reviewId, resolve);
        });

        // Map action to tool result status
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

        // Broadcast completion to dismiss remote modals
        if (webviewProvider) {
            webviewProvider.broadcastPlanReviewCompleted(reviewId, status);
        }

        return toolResult;
    } catch (error) {
        console.error('[TaskSync] Error in plan review:', error);
        return {
            status: 'cancelled',
            requiredRevisions: [],
            reviewId
        };
    } finally {
        cancellationDisposable.dispose();
        pendingReviews.delete(reviewId); // Clean up in case of error
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
