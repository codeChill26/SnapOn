import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  AUTH_TOKEN: '@snapon/auth_token',
  USER_DATA: '@snapon/user_data',
  WALLET: '@snapon/wallet',
  ROLE: '@snapon/role',
};

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

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
};
