import { Tabs } from 'expo-router';
import { Calculator, Ruler } from 'lucide-react-native';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A0F0A',
          borderTopColor: 'rgba(255, 140, 0, 0.3)',
          borderTopWidth: 2,
          elevation: Platform.select({ android: 10, default: 0 }),
          shadowColor: '#FF8C00',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          position: 'absolute' as const,
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#8B7355',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        lazy: false,
      }}
    >
      <Tabs.Screen
        name="calculator"
        options={{
          title: 'Calculator',
          tabBarIcon: ({ color, size }) => (
            <Calculator size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="advanced"
        options={{
          title: 'Advanced',
          tabBarIcon: ({ color, size }) => (
            <Ruler size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
