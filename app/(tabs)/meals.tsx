import { View, Text, StyleSheet } from 'react-native';

export default function MealsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>饮食记录</Text>
      <Text style={styles.placeholder}>饮食记录页面（后续实现）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  placeholder: { color: '#999' },
});
