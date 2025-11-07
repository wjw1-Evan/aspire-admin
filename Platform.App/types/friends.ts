export type FriendRequestStatus = 'Pending' | 'Accepted' | 'Rejected';

export type FriendRequestDirection = 'Incoming' | 'Outgoing';

export interface FriendSummary {
  userId: string;
  username: string;
  displayName?: string;
  phoneNumber?: string;
  friendshipId: string;
  sessionId?: string;
  createdAt?: string;
}

export interface FriendSearchResult {
  userId: string;
  username: string;
  displayName?: string;
  phoneNumber?: string;
  isFriend: boolean;
  hasPendingRequest: boolean;
  isIncomingRequest: boolean;
}

export interface FriendRequestItem {
  id: string;
  requesterId: string;
  requesterUsername: string;
  requesterDisplayName?: string;
  requesterPhoneNumber?: string;
  targetUserId: string;
  targetUsername: string;
  targetDisplayName?: string;
  targetPhoneNumber?: string;
  status: FriendRequestStatus;
  message?: string;
  createdAt?: string;
  processedAt?: string | null;
}

export interface FriendSessionResponse {
  sessionId: string;
  friendUserId: string;
}

