import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNetworkState } from 'expo-network';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useUserStore } from '../../src/store/useUserStore';
import { useMealStore } from '../../src/store/useMealStore';
import { useExerciseStore } from '../../src/store/useExerciseStore';
import { getDailyPlan, subscribeDailyPlan, saveDailyPlan, getWeightRecords, saveWeightRecord } from '../../src/services/firestore';
import type { MealType, CompletedStatus } from '../../src/models';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTodayDateStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function getDisplayDate(): string {
  return format(new Date(), 'M月d日 EEEE', { locale: zhCN });
}

function getMealLabel(type: MealType): string {
  const map: Record<MealType, string> = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '加餐',
  };
  return map[type];
}

function getMealIcon(type: MealType): string {
  const map: Record<MealType, string> = {
    breakfast: 'coffee',
    lunch: 'food',
    dinner: 'silverware-fork-knife',
    snack: 'cookie',
  };
  return map[type];
}

// ─── Circular Progress (SVG) ───────────────────────────────────────────────

interface RingProps {
  consumed: number;
  target: number;
  size?: number;
}

function CalorieRing({ consumed, target, size = 160 }: RingProps) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(consumed / target, 1);
  const remaining = target - consumed;
  const dashOffset = circumference * (1 - pct);

  const overTarget = consumed > target;
  const progressColor = overTarget ? '#ef5350' : '#4CAF50';
  const trackColor = '#e8f5e9';

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      {/* Center text */}
      <View style={[styles.ringCenter, { width: size, height: size }]}>
        <Text style={styles.ringConsumed}>{consumed}</Text>
        <Text style={styles.ringUnit}>千卡</Text>
        <Text style={styles.ringTarget}>
          {overTarget ? `超出 ${-remaining}` : `剩余 ${remaining}`} kcal
        </Text>
      </View>
    </View>
  );
}

// ─── Network Banner ─────────────────────────────────────────────────────────

function NetworkBanner({ isConnected }: { isConnected: boolean | null }) {
  if (isConnected === false) {
    return (
      <View style={styles.networkBanner}>
        <MaterialCommunityIcons name="wifi-off" size={16} color="#fff" />
        <Text style={styles.networkText}>网络已断开，部分功能可能不可用</Text>
      </View>
    );
  }
  return null;
}

// ─── Meal Card ─────────────────────────────────────────────────────────────

interface MealCardProps {
  type: MealType;
  completed: boolean;
  calories?: number;
  onToggle: () => void;
}

function MealCard({ type, completed, calories, onToggle }: MealCardProps) {
  return (
    <TouchableOpacity
      style={[styles.mealCard, completed && styles.mealCardDone]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name={getMealIcon(type) as any}
        size={28}
        color={completed ? '#4CAF50' : '#bdbdbd'}
      />
      <Text style={[styles.mealCardLabel, completed && styles.mealCardLabelDone]}>
        {getMealLabel(type)}
      </Text>
      {calories !== undefined && calories > 0 && (
        <Text style={styles.mealCardCal}>{calories} kcal</Text>
      )}
      <MaterialCommunityIcons
        name={completed ? 'check-circle' : 'circle-outline'}
        size={20}
        color={completed ? '#4CAF50' : '#bdbdbd'}
        style={{ marginTop: 4 }}
      />
    </TouchableOpacity>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function HomeScreen() {
  const router = useRouter();
  const networkState = useNetworkState();
  const isConnected = networkState.isConnected ?? null;

  const { userId, profile } = useUserStore();
  const { meals, setMeals, todayCalories, updateCalories } = useMealStore();
  const { exercises, setExercises, completeExercises } = useExerciseStore();

  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<CompletedStatus>({
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
    exercises: false,
  });
  const [totalConsumed, setTotalConsumed] = useState(0);
  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  const today = getTodayDateStr();
  const displayDate = getDisplayDate();

  const dailyTarget = profile?.dailyCalorieTarget ?? 2000;

  // Completed count
  const completedCount = [
    completed.breakfast,
    completed.lunch,
    completed.dinner,
    completed.snack,
    completed.exercises,
  ].filter(Boolean).length;
  const totalItems = 5;

  // Calorie breakdown by meal type
  const caloriesByType = meals.reduce<Record<MealType, number>>(
    (acc, m) => {
      acc[m.type] = (acc[m.type] ?? 0) + m.totalCalories;
      return acc;
    },
    { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
  );

  // Load data on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const uid = userId;
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const plan = await getDailyPlan(uid, today);
        if (plan) {
          setCompleted(plan.completed);
          setMeals(plan.meals ?? []);
          setExercises(plan.exercises ?? []);
          setTotalConsumed(plan.totalCaloriesConsumed ?? 0);
        } else {
          // No plan yet — show placeholder
          setCompleted({ breakfast: false, lunch: false, dinner: false, snack: false, exercises: false });
          setMeals([]);
          setExercises([]);
          setTotalConsumed(0);
        }

        // Load last weight
        const records = await getWeightRecords(uid, 1);
        if (records.length > 0) {
          setLastWeight(records[0].weight);
        }
      } catch {
        // Offline or error — show placeholder, don't crash
        setCompleted({ breakfast: false, lunch: false, dinner: false, snack: false, exercises: false });
        setMeals([]);
        setExercises([]);
        setTotalConsumed(0);
      } finally {
        setLoading(false);
      }
    };

    if (profile) load();
  }, [profile, today]);

  // Subscribe to real-time updates
  useEffect(() => {
    const uid = userId;
    if (!userId) return;
    const unsubscribe = subscribeDailyPlan(uid, today, (plan) => {
      if (plan) {
        setCompleted(plan.completed);
        setMeals(plan.meals ?? []);
        setExercises(plan.exercises ?? []);
        setTotalConsumed(plan.totalCaloriesConsumed ?? 0);
      }
    });
    return unsubscribe;
  }, [profile, today]);

  // Sync calories
  useEffect(() => {
    updateCalories();
    setTotalConsumed(todayCalories);
  }, [meals]);

  const toggleMeal = useCallback(
    async (type: MealType) => {
      const uid = userId;
      if (!userId) return;
      const newCompleted = { ...completed, [type]: !completed[type] };
      setCompleted(newCompleted);
      try {
        const plan = await getDailyPlan(uid, today);
        await saveDailyPlan(uid, {
          id: today,
          date: today,
          meals: plan?.meals ?? [],
          exercises: plan?.exercises ?? [],
          completed: newCompleted,
          totalCaloriesConsumed: totalConsumed,
          totalCaloriesBurned: 0,
          aiGenerated: false,
        });
      } catch {
        // Silently fail on offline
      }
    },
    [completed, today, totalConsumed]
  );

  const toggleExercise = useCallback(async () => {
    const uid = userId;
    if (!userId) return;
    const newCompleted = { ...completed, exercises: !completed.exercises };
    setCompleted(newCompleted);
    completeExercises();
    try {
      const plan = await getDailyPlan(uid, today);
      await saveDailyPlan(uid, {
        id: today,
        date: today,
        meals: plan?.meals ?? [],
        exercises: plan?.exercises ?? [],
        completed: newCompleted,
        totalCaloriesConsumed: totalConsumed,
        totalCaloriesBurned: 0,
        aiGenerated: false,
      });
    } catch {
      // Silently fail on offline
    }
  }, [completed, today, totalConsumed, completeExercises]);

  const handleWeightSubmit = async () => {
    const uid = userId;
    if (!userId) return;
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0) {
      Alert.alert('错误', '请输入有效体重');
      return;
    }
    try {
      await saveWeightRecord(uid, { date: today, weight: w });
      setLastWeight(w);
      setWeightModalVisible(false);
      setWeightInput('');
      Alert.alert('成功', `体重 ${w} kg 已记录`);
    } catch {
      Alert.alert('错误', '记录失败，请重试');
    }
  };

  // Build exercise summary text
  const exerciseSummary = (() => {
    if (exercises.length === 0) return '今日暂无运动计划';
    const cardio = exercises.filter((e) => e.type === 'cardio');
    const strength = exercises.filter((e) => e.type === 'strength');
    const parts: string[] = [];
    if (cardio.length > 0) {
      const totalMin = cardio.reduce((s, e) => s + (e.duration ?? 0), 0);
      parts.push(`有氧 ${totalMin} 分钟`);
    }
    if (strength.length > 0) {
      parts.push(`无氧 ${strength.length} 项`);
    }
    return parts.join(' + ') || '今日暂无运动计划';
  })();

  const consumed = totalConsumed > 0 ? totalConsumed : todayCalories;

  return (
    <View style={{ flex: 1 }}>
      {/* Network Banner */}
      <NetworkBanner isConnected={isConnected} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Date & Progress Header */}
        <View style={styles.header}>
          <Text style={styles.dateText}>{displayDate}</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {completedCount}/{totalItems} 已完成
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(completedCount / totalItems) * 100}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Calorie Ring */}
        <View style={styles.ringSection}>
          <CalorieRing consumed={consumed} target={dailyTarget} />
          <View style={styles.ringLabels}>
            <Text style={styles.ringSubtext}>
              目标 {dailyTarget} kcal / {(profile?.weight ?? 0) > 0 ? `当前 ${profile!.weight} kg` : ''}
            </Text>
          </View>
        </View>

        {/* Meal Check-in Cards */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>今日饮食打卡</Text>
        </View>
        <View style={styles.mealGrid}>
          {MEAL_TYPES.map((type) => (
            <MealCard
              key={type}
              type={type}
              completed={completed[type]}
              calories={caloriesByType[type]}
              onToggle={() => toggleMeal(type)}
            />
          ))}
        </View>

        {/* Exercise Check-in Card */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>今日运动打卡</Text>
        </View>
        <TouchableOpacity
          style={[styles.exerciseCard, completed.exercises && styles.exerciseCardDone]}
          onPress={toggleExercise}
          activeOpacity={0.7}
        >
          <View style={styles.exerciseLeft}>
            <MaterialCommunityIcons
              name="dumbbell"
              size={28}
              color={completed.exercises ? '#4CAF50' : '#bdbdbd'}
            />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.exerciseTitle, completed.exercises && styles.exerciseTitleDone]}>
                {completed.exercises ? '已完成' : '点击打卡'}
              </Text>
              <Text style={styles.exerciseSummary}>{exerciseSummary}</Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name={completed.exercises ? 'check-circle' : 'circle-outline'}
            size={28}
            color={completed.exercises ? '#4CAF50' : '#bdbdbd'}
          />
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>快捷操作</Text>
        </View>
        <View style={styles.actionsRow}>
          {/* Quick Photo */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(tabs)/meals')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="camera" size={32} color="#4CAF50" />
            <Text style={styles.actionLabel}>拍照记录</Text>
            <Text style={styles.actionSubLabel}>记录饮食</Text>
          </TouchableOpacity>

          {/* Weight Entry */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setWeightModalVisible(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="scale-bathroom" size={32} color="#FF9800" />
            <Text style={styles.actionLabel}>体重打卡</Text>
            <Text style={styles.actionSubLabel}>
              {lastWeight ? `${lastWeight} kg` : '点击记录'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Weight Entry Modal */}
      <Modal
        visible={weightModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWeightModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>记录体重</Text>
            <Text style={styles.modalDate}>{displayDate}</Text>
            <TextInput
              style={styles.weightInput}
              placeholder="请输入体重 (kg)"
              placeholderTextColor="#aaa"
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setWeightModalVisible(false);
                  setWeightInput('');
                }}
              >
                <Text style={styles.modalBtnCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleWeightSubmit}
              >
                <Text style={styles.modalBtnConfirmText}>确认</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { paddingBottom: 32 },

  // Network Banner
  networkBanner: {
    backgroundColor: '#ef5350',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 6,
  },
  networkText: { color: '#fff', fontSize: 13 },

  // Header
  header: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  dateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressText: { color: '#fff', fontSize: 13 },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },

  // Ring
  ringSection: {
    alignItems: 'center',
    marginTop: -30,
    marginBottom: 8,
  },
  ringCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringConsumed: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  ringUnit: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  ringTarget: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  ringLabels: { marginTop: 8 },
  ringSubtext: { color: '#999', fontSize: 13 },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },

  // Meal Grid
  mealGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  mealCard: {
    width: (SCREEN_W - 32 - 30) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  mealCardDone: {
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8e9',
  },
  mealCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginTop: 6,
  },
  mealCardLabelDone: { color: '#2e7d32' },
  mealCardCal: { fontSize: 12, color: '#888', marginTop: 2 },

  // Exercise Card
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  exerciseCardDone: {
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8e9',
  },
  exerciseLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  exerciseTitle: { fontSize: 15, fontWeight: '600', color: '#555' },
  exerciseTitleDone: { color: '#2e7d32' },
  exerciseSummary: { fontSize: 12, color: '#888', marginTop: 2 },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 6 },
  actionSubLabel: { fontSize: 12, color: '#888', marginTop: 2 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: SCREEN_W - 80,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  modalDate: { fontSize: 13, color: '#999', marginBottom: 16 },
  weightInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#f0f0f0' },
  modalBtnConfirm: { backgroundColor: '#4CAF50' },
  modalBtnCancelText: { color: '#666', fontSize: 15, fontWeight: '600' },
  modalBtnConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
