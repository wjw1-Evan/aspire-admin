import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ProjectListScreen from './index';
import ProjectDetailScreen from './[id]';

const Tab = createBottomTabNavigator();

export default function ProjectManagementLayout() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'list';

          if (route.name === 'projectList') {
            iconName = 'folder-outline';
          } else if (route.name === 'projectDetail') {
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
        name="projectList"
        component={ProjectListScreen}
        options={{
          title: '项目列表',
          headerTitleAlign: 'center',
        }}
      />
      <Tab.Screen
        name="projectDetail"
        component={ProjectDetailScreen}
        options={{
          title: '项目详情',
          headerTitleAlign: 'center',
        }}
      />
    </Tab.Navigator>
  );
}
