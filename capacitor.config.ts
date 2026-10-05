import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ru.pogoshooter.game', // поменяй на свой домен до первой публикации в магазине — потом сменить нельзя
  appName: 'Pogoshooter',
  webDir: 'dist',
  backgroundColor: '#141a3a',
  android: { allowMixedContent: false },
  ios: { contentInset: 'never' },
};

export default config;
