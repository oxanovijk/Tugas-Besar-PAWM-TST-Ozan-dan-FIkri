import { Tabs } from 'expo-router';

import { color, font, Icon } from '../../src/ui';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: color.forest,
      tabBarInactiveTintColor: color.muted,
      tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.line },
      tabBarLabelStyle: { fontFamily: font.bold, fontSize: 12 },
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Jelajah',
        tabBarIcon: ({ focused }) => <Icon name="compass" tint={focused ? color.forest : color.muted} />,
      }} />
      <Tabs.Screen name="account" options={{
        title: 'Akun',
        tabBarIcon: ({ focused }) => <Icon name="user" tint={focused ? color.forest : color.muted} />,
      }} />
    </Tabs>
  );
}
