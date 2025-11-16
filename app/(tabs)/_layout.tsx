
import React from 'react';
import { Stack } from 'expo-router';

export default function TabLayout() {
  // Use Stack navigation without tabs
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen key="home" name="(home)" />
      <Stack.Screen key="profile" name="profile" />
    </Stack>
  );
}
