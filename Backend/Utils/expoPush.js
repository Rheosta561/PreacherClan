import { Expo } from "expo-server-sdk";

export const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN, 
});
