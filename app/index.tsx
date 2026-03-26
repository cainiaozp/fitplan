import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { generateLocalUserId, setLocalUserId } from '../src/services/auth';
import { saveUserProfile } from '../src/services/firestore';
import { useUserStore } from '../src/store/useUserStore';
import { calculateBMR, calculateTDEE, calculateDailyTarget } from '../src/utils/calorie';
import type { Gender, ActivityLevel } from '../src/models';

const ACTIVITY_OPTIONS: { label: string; value: ActivityLevel }[] = [
  { label: '久坐（几乎不运动）', value: 'sedentary' },
  { label: '轻度活跃（每周1-3天）', value: 'light' },
  { label: '中度活跃（每周3-5天）', value: 'moderate' },
  { label: '高度活跃（每周6-7天）', value: 'active' },
];

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { setUserId, setProfile } = useUserStore();

  const [loading, setLoading] = useState(false);

  // Profile fields
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goalWeight, setGoalWeight] = useState('');
  const [targetDays, setTargetDays] = useState('');

  // Computed calorie target
  const [dailyTarget, setDailyTarget] = useState<number | null>(null);

  useEffect(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const a = parseInt(age, 10);
    if (h > 0 && w > 0 && a > 0) {
      const bmr = calculateBMR(w, h, a, gender);
      const tdee = calculateTDEE(bmr, activityLevel);
      const target = calculateDailyTarget(tdee);
      setDailyTarget(target);
    } else {
      setDailyTarget(null);
    }
  }, [height, weight, age, gender, activityLevel]);

  const validateForm = () => {
    if (!height || parseFloat(height) <= 0) {
      Alert.alert('错误', '请输入有效身高');
      return false;
    }
    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert('错误', '请输入有效体重');
      return false;
    }
    if (!age || parseInt(age, 10) <= 0) {
      Alert.alert('错误', '请输入有效年龄');
      return false;
    }
    if (!goalWeight || parseFloat(goalWeight) <= 0) {
      Alert.alert('错误', '请输入有效目标体重');
      return false;
    }
    if (!targetDays || parseInt(targetDays, 10) <= 0) {
      Alert.alert('错误', '请输入有效计划天数');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const h = parseFloat(height);
      const w = parseFloat(weight);
      const a = parseInt(age, 10);
      const gw = parseFloat(goalWeight);
      const td = parseInt(targetDays, 10);

      const bmr = calculateBMR(w, h, a, gender);
      const tdee = calculateTDEE(bmr, activityLevel);
      const dct = calculateDailyTarget(tdee);

      // Generate local user ID
      const userId = generateLocalUserId();
      await setLocalUserId(userId);

      const profile = {
        height: h,
        weight: w,
        age: a,
        gender,
        activityLevel,
        goalWeight: gw,
        targetDays: td,
        bmr,
        tdee,
        dailyCalorieTarget: dct,
      };

      await saveUserProfile(userId, profile);
      setUserId(userId);
      setProfile(profile);

      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err?.message ?? '未知错误';
      Alert.alert('保存失败', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>FitPlan</Text>
        <Text style={styles.subtitle}>创建您的健身档案</Text>

        {/* Gender */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>性别</Text>
          <View style={styles.optionRow}>
            {GENDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionBtn, gender === opt.value && styles.optionBtnActive]}
                onPress={() => setGender(opt.value)}
              >
                <Text style={[styles.optionText, gender === opt.value && styles.optionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Age */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>年龄（岁）</Text>
          <TextInput
            style={styles.input}
            placeholder="25"
            placeholderTextColor="#aaa"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
          />
        </View>

        {/* Height */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>身高（cm）</Text>
          <TextInput
            style={styles.input}
            placeholder="170"
            placeholderTextColor="#aaa"
            value={height}
            onChangeText={setHeight}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Current Weight */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>当前体重（kg）</Text>
          <TextInput
            style={styles.input}
            placeholder="70"
            placeholderTextColor="#aaa"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Activity Level */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>活动水平</Text>
          <View style={styles.optionCol}>
            {ACTIVITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionBtnFull, activityLevel === opt.value && styles.optionBtnActive]}
                onPress={() => setActivityLevel(opt.value)}
              >
                <Text
                  style={[styles.optionText, activityLevel === opt.value && styles.optionTextActive]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Goal Weight */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>目标体重（kg）</Text>
          <TextInput
            style={styles.input}
            placeholder="65"
            placeholderTextColor="#aaa"
            value={goalWeight}
            onChangeText={setGoalWeight}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Target Days */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>计划天数</Text>
          <TextInput
            style={styles.input}
            placeholder="30"
            placeholderTextColor="#aaa"
            value={targetDays}
            onChangeText={setTargetDays}
            keyboardType="number-pad"
          />
        </View>

        {/* Calorie preview */}
        {dailyTarget !== null && (
          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>每日热量目标</Text>
            <Text style={styles.previewValue}>{dailyTarget} kcal</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>开始计划</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionCol: {
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  optionBtnFull: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  optionBtnActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextActive: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  previewBox: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 13,
    color: '#2e7d32',
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  submitBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
