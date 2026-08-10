import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  AUTH_TOKEN: '@snapon/access_token', // Now represents the Access Token
  REFRESH_TOKEN: '@snapon/refresh_token',
  USER_DATA: '@snapon/user_data',
  WALLET: '@snapon/wallet',
  ROLE: '@snapon/role',
  CHAT_DRAFTS: '@snapon/chat_drafts',
  BANK_DETAILS: '@snapon/bank_details',
};

export interface ChatDraft {
  text: string;
  updatedAt: string;
}

export const storage = {
  async setToken(token?: string | null): Promise<void> {
    if (!token) {
      await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
    } else {
      await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
    }
  },

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.AUTH_TOKEN);
  },

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
  },

  async setRefreshToken(token?: string | null): Promise<void> {
    if (!token) {
      await AsyncStorage.removeItem(KEYS.REFRESH_TOKEN);
    } else {
      await AsyncStorage.setItem(KEYS.REFRESH_TOKEN, token);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
  },

  async removeRefreshToken(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.REFRESH_TOKEN);
  },

  async setUserData(user: any): Promise<void> {
    if (!user) {
      await AsyncStorage.removeItem(KEYS.USER_DATA);
    } else {
      await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(user));
    }
  },

  async getUserData(): Promise<any | null> {
    const data = await AsyncStorage.getItem(KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  },

  async removeUserData(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.USER_DATA);
  },

  async setWallet(wallet: any): Promise<void> {
    if (!wallet) {
      await AsyncStorage.removeItem(KEYS.WALLET);
    } else {
      await AsyncStorage.setItem(KEYS.WALLET, JSON.stringify(wallet));
    }
  },

  async getWallet(): Promise<any | null> {
    const data = await AsyncStorage.getItem(KEYS.WALLET);
    return data ? JSON.parse(data) : null;
  },

  async setRole(role?: string | null): Promise<void> {
    if (!role) {
      await AsyncStorage.removeItem(KEYS.ROLE);
    } else {
      await AsyncStorage.setItem(KEYS.ROLE, role);
    }
  },

  async getRole(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.ROLE);
  },

  async getChatDrafts(): Promise<Record<string, ChatDraft>> {
    const data = await AsyncStorage.getItem(KEYS.CHAT_DRAFTS);
    return data ? JSON.parse(data) : {};
  },

  async getChatDraft(conversationId: string): Promise<ChatDraft | null> {
    const drafts = await this.getChatDrafts();
    return drafts[conversationId] || null;
  },

  async setChatDraft(conversationId: string, text: string): Promise<void> {
    const drafts = await this.getChatDrafts();
    const trimmedText = text.trim();

    if (!trimmedText) {
      delete drafts[conversationId];
    } else {
      drafts[conversationId] = {
        text,
        updatedAt: new Date().toISOString(),
      };
    }

    await AsyncStorage.setItem(KEYS.CHAT_DRAFTS, JSON.stringify(drafts));
  },

  async clearChatDraft(conversationId: string): Promise<void> {
    const drafts = await this.getChatDrafts();
    delete drafts[conversationId];
    await AsyncStorage.setItem(KEYS.CHAT_DRAFTS, JSON.stringify(drafts));
  },

  async setBankDetails(bankName?: string | null, bankAccountNumber?: string | null): Promise<void> {
    if (!bankName && !bankAccountNumber) {
      await AsyncStorage.removeItem(KEYS.BANK_DETAILS);
    } else {
      await AsyncStorage.setItem(KEYS.BANK_DETAILS, JSON.stringify({ bankName: bankName || '', bankAccountNumber: bankAccountNumber || '' }));
    }
  },

  async getBankDetails(): Promise<{ bankName: string; bankAccountNumber: string } | null> {
    const data = await AsyncStorage.getItem(KEYS.BANK_DETAILS);
    return data ? JSON.parse(data) : null;
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};
