import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import TaskListScreen from './index';
import TaskDetailScreen from './[id]';

const Tab = createBottomTabNavigator();

export default function TaskManagementLayout() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'list';

          if (route.name === 'taskList') {
            iconName = 'list-outline';
          } else if (route.name === 'taskDetail') {
            iconName = 'document-text-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#999',
        headerShown: true,
      })}
    >
      <Tab.Screen
        name="taskList"
        component={TaskListScreen}
        options={{
          title: '任务列表',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="taskDetail"
        component={TaskDetailScreen}
        options={{
          title: '任务详情',
          headerTitleAlign: 'center',
        }}
      />
    </Tab.Navigator>
  );
}
