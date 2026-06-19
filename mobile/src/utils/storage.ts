import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  AUTH_TOKEN: '@snapon/auth_token',
  USER_DATA: '@snapon/user_data',
  WALLET: '@snapon/wallet',
  ROLE: '@snapon/role',
  CHAT_DRAFTS: '@snapon/chat_drafts',
};

export interface ChatDraft {
  text: string;
  updatedAt: string;
}

export const storage = {
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
  },

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.AUTH_TOKEN);
  },

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
  },

  async setUserData(user: any): Promise<void> {
    await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(user));
  },

  async getUserData(): Promise<any | null> {
    const data = await AsyncStorage.getItem(KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  },

  async removeUserData(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.USER_DATA);
  },

  async setWallet(wallet: any): Promise<void> {
    await AsyncStorage.setItem(KEYS.WALLET, JSON.stringify(wallet));
  },

  async getWallet(): Promise<any | null> {
    const data = await AsyncStorage.getItem(KEYS.WALLET);
    return data ? JSON.parse(data) : null;
  },

  async setRole(role: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.ROLE, role);
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

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};
