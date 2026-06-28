import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

export const useAppNavigation = () => {
  return useNavigation<NavigationProp<RootStackParamList>>();
};
