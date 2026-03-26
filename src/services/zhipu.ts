import type { FoodItem, Exercise } from '../models';

const GLM_API_KEY = process.env.EXPO_PUBLIC_ZHIPU_API_KEY!;
const GLM_4V_URL = 'https://open.bigmodel.cn/api/paas/v4/images/understanding';
const GLM_4_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 食物识别 + 卡路里估算
export const recognizeFood = async (
  imageBase64: string
): Promise<{ foods: FoodItem[]; totalEstimate: [number, number] }> => {
  const response = await fetch(GLM_4V_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'glm-4v-plus',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
            {
              type: 'text',
              text: '识别图片中的食物，估算每种食物的热量（kcal），返回JSON格式：{"foods":[{"name":"食物名","estimatedCalories":200,"calorieRange":[150,250],"portion":"份量描述"}],"totalEstimate":[min,max]}',
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  // 解析 JSON
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    // Add id to each food item if not present
    parsed.foods = parsed.foods.map((food: Omit<FoodItem, 'id'>) => ({
      id: Math.random().toString(36).substr(2, 9),
      ...food,
    }));
    return parsed;
  } catch {
    throw new Error('GLM 响应解析失败: ' + content);
  }
};

// 生成每日运动计划
export const generateExercisePlan = async (params: {
  weight: number;
  goalWeight: number;
  targetDays: number;
  tdee: number;
}): Promise<Exercise[]> => {
  const response = await fetch(GLM_4_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'glm-4',
      messages: [
        {
          role: 'user',
          content: `根据以下信息生成今日运动计划，返回JSON数组格式：${JSON.stringify(params)}
规则：总时长45-60分钟，有氧+无氧，返回格式：
[{"id":"1","name":"运动名","type":"cardio|strength","duration":30,"caloriesBurned":200,"description":"描述"}]`,
        },
      ],
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error('GLM 运动计划解析失败: ' + content);
  }
};
