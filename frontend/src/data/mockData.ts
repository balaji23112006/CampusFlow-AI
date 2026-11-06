/**
 * mockData.ts — CampusFlow AI
 *
 * IMPORTANT: This file contains ONLY structural type exports and empty defaults.
 * All production data (workflows, documents, audit logs, users) is loaded from
 * the real backend API via /api/v1/* endpoints.
 *
 * Do NOT add hardcoded workflows, documents, audit events, user profiles,
 * fake IDs, fake timestamps, or fake approval records here.
 */

import type { WorkflowItem, ChatMessage, User } from '../types';

/**
 * Empty defaults — pages initialize with these and immediately fetch from backend.
 */
export const mockCurrentUser: User = {
  id: '',
  name: '',
  email: '',
  role: 'student',
};

export const mockWorkflows: WorkflowItem[] = [];

export const mockChatMessages: ChatMessage[] = [];

export const mockDocumentsList: never[] = [];
