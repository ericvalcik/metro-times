import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import React from 'react';

import AppTabs from '@/components/app-tabs';

const BlackTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000',
    card: '#000000',
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={BlackTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}
