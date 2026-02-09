/**
 * Plan Review Types
 * Shared types between the extension host and plan review webview
 */

/** Comment/revision structure returned to the AI */
export interface RequiredPlanRevision {
    revisedPart: string;
    revisorInstructions: string;
}

/** Plan review input (from AI tool call) */
export interface PlanReviewInput {
    plan: string;
    title?: string;
}

/** Plan review result (returned to AI) */
export interface PlanReviewToolResult {
    status: 'approved' | 'approvedWithComments' | 'recreateWithChanges' | 'cancelled';
    requiredRevisions: RequiredPlanRevision[];
    reviewId: string;
    /** Explicit instruction for the model on what to do next */
    nextStep: string;
}

/** Plan review panel options */
export interface PlanReviewOptions {
    plan: string;
    title: string;
    readOnly: boolean;
    existingComments: RequiredPlanRevision[];
    interactionId: string;
}

/** Panel internal result */
export interface PlanReviewPanelResult {
    action: 'approved' | 'approvedWithComments' | 'recreateWithChanges' | 'closed';
    requiredRevisions: RequiredPlanRevision[];
}

/** Messages FROM extension TO webview */
export type PlanReviewToWebviewMessage =
    | { type: 'showPlan'; content: string; title: string; readOnly: boolean; comments: RequiredPlanRevision[] };

/** Messages FROM webview TO extension */
export type PlanReviewFromWebviewMessage =
    | { type: 'ready' }
    | { type: 'approve'; comments: RequiredPlanRevision[] }
    | { type: 'approveWithComments'; comments: RequiredPlanRevision[] }
    | { type: 'reject'; comments: RequiredPlanRevision[] }
    | { type: 'close'; comments: RequiredPlanRevision[] }
    | { type: 'exportPlan' };

/** Stored plan review interaction for history */
export interface StoredPlanReview {
    id: string;
    timestamp: number;
    plan: string;
    title: string;
    status: 'pending' | 'approved' | 'approvedWithComments' | 'recreateWithChanges' | 'cancelled' | 'closed';
    requiredRevisions: RequiredPlanRevision[];
}
