import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { AppState, Text, View } from 'react-native';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_400Regular_Italic,
  IBMPlexMono_500Medium,
  IBMPlexMono_500Medium_Italic,
  IBMPlexMono_600SemiBold,
  IBMPlexMono_600SemiBold_Italic,
  IBMPlexMono_700Bold,
  IBMPlexMono_700Bold_Italic,
} from '@expo-google-fonts/ibm-plex-mono';

import { AppContextProvider } from '@/components/AppContext';

const BlackTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000',
    card: '#000000',
  },
};

const queryClient = new QueryClient();

SplashScreen.preventAutoHideAsync().catch(() => {});

(Text as unknown as { defaultProps?: { style?: unknown } }).defaultProps =
  (Text as unknown as { defaultProps?: { style?: unknown } }).defaultProps ?? {};
(Text as unknown as { defaultProps: { style: unknown } }).defaultProps.style = {
  fontFamily: 'IBMPlexMono_400Regular',
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    IBMPlexMono_400Regular,
    IBMPlexMono_400Regular_Italic,
    IBMPlexMono_500Medium,
    IBMPlexMono_500Medium_Italic,
    IBMPlexMono_600SemiBold,
    IBMPlexMono_600SemiBold_Italic,
    IBMPlexMono_700Bold,
    IBMPlexMono_700Bold_Italic,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppContextProvider>
        <ThemeProvider value={BlackTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#000000' },
              // The only screens in this stack are the native tabs and the
              // widget-entry redirect helper; neither should slide. Disabling
              // the animation kills the "Times page slides in from the right"
              // transition when the lock-screen widget deep-links through
              // widget-entry → "/".
              animation: 'none',
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="widget-entry" />
          </Stack>
        </ThemeProvider>
      </AppContextProvider>
    </QueryClientProvider>
  );
}
