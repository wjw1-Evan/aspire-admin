import { useCallback, useState } from 'react';

import { friendService, type CreateFriendRequestPayload } from '@/services/friends';
import type {
  FriendRequestDirection,
  FriendRequestItem,
  FriendSearchResult,
  FriendSessionResponse,
  FriendSummary,
} from '@/types/friends';

export interface UseFriendsResult {
  friends: FriendSummary[];
  friendsLoading: boolean;
  loadFriends: () => Promise<void>;
  refreshFriends: () => Promise<void>;
  incomingRequests: FriendRequestItem[];
  outgoingRequests: FriendRequestItem[];
  requestsLoading: boolean;
  loadRequests: () => Promise<void>;
  approveRequest: (requestId: string) => Promise<FriendRequestItem>;
  rejectRequest: (requestId: string) => Promise<FriendRequestItem>;
  searchResults: FriendSearchResult[];
  searchLoading: boolean;
  searchByPhone: (phoneNumber: string) => Promise<FriendSearchResult[]>;
  searchByKeyword: (keyword: string) => Promise<FriendSearchResult[]>;
  searchByQuery: (query: string) => Promise<FriendSearchResult[]>;
  clearSearch: () => void;
  sendFriendRequest: (payload: CreateFriendRequestPayload) => Promise<FriendRequestItem>;
  ensureSession: (friendUserId: string) => Promise<FriendSessionResponse>;
}

const loadRequestsByDirection = async (direction: FriendRequestDirection): Promise<FriendRequestItem[]> => {
  return friendService.getFriendRequests(direction);
};

export function useFriends(): UseFriendsResult {
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const loadFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const result = await friendService.getFriends();
      setFriends(result);
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  const refreshFriends = useCallback(async () => {
    await loadFriends();
  }, [loadFriends]);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      // 使用 Promise.allSettled 允许部分请求失败
      const [incomingResult, outgoingResult] = await Promise.allSettled([
        loadRequestsByDirection('Incoming'),
        loadRequestsByDirection('Outgoing'),
      ]);
      
      if (incomingResult.status === 'fulfilled') {
        setIncomingRequests(incomingResult.value);
      } else {
        console.warn('加载 incoming 请求失败:', incomingResult.reason);
        setIncomingRequests([]);
      }
      
      if (outgoingResult.status === 'fulfilled') {
        setOutgoingRequests(outgoingResult.value);
      } else {
        console.warn('加载 outgoing 请求失败:', outgoingResult.reason);
        setOutgoingRequests([]);
      }
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const approveRequest = useCallback(
    async (requestId: string) => {
      const result = await friendService.approveRequest(requestId);
      // 使用 Promise.allSettled 允许部分刷新失败
      const [friendsResult, requestsResult] = await Promise.allSettled([
        loadFriends(),
        loadRequests(),
      ]);
      
      if (friendsResult.status === 'rejected') {
        console.warn('刷新好友列表失败:', friendsResult.reason);
      }
      if (requestsResult.status === 'rejected') {
        console.warn('刷新好友请求失败:', requestsResult.reason);
      }
      
      return result;
    },
    [loadFriends, loadRequests]
  );

  const rejectRequest = useCallback(
    async (requestId: string) => {
      const result = await friendService.rejectRequest(requestId);
      await loadRequests();
      return result;
    },
    [loadRequests]
  );

  const searchByPhone = useCallback(async (phoneNumber: string) => {
    setSearchLoading(true);
    try {
      const results = await friendService.searchByPhone(phoneNumber);
      setSearchResults(results);
      return results;
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const searchByKeyword = useCallback(async (keyword: string) => {
    setSearchLoading(true);
    try {
      const results = await friendService.searchByKeyword(keyword);
      setSearchResults(results);
      return results;
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const searchByQuery = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return [];
    }

    setSearchLoading(true);
    try {
      const results = await friendService.searchByQuery(trimmed);
      setSearchResults(results);
      return results;
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
  }, []);

  const sendFriendRequest = useCallback(
    async (payload: CreateFriendRequestPayload) => {
      const result = await friendService.sendFriendRequest(payload);
      await loadRequests();
      return result;
    },
    [loadRequests]
  );

  const ensureSession = useCallback(async (friendUserId: string) => {
    return friendService.ensureSession(friendUserId);
  }, []);

  return {
    friends,
    friendsLoading,
    loadFriends,
    refreshFriends,
    incomingRequests,
    outgoingRequests,
    requestsLoading,
    loadRequests,
    approveRequest,
    rejectRequest,
    searchResults,
    searchLoading,
    searchByPhone,
    searchByKeyword,
    searchByQuery,
    clearSearch,
    sendFriendRequest,
    ensureSession,
  };
}

