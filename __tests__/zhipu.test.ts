// Mock fetch for GLM API
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => { mockFetch.mockReset(); });

test('recognizeFood returns parsed food items', async () => {
  mockFetch.mockResolvedValueOnce({
    json: async () => ({
      choices: [{
        message: {
          content: '{"foods":[{"name":"米饭","estimatedCalories":200,"calorieRange":[150,250],"portion":"一碗"}],"totalEstimate":[150,250]}',
        },
      }],
    }),
  });

  const { recognizeFood } = await import('../src/services/zhipu');
  const result = await recognizeFood('fake_base64');
  expect(result.foods).toHaveLength(1);
  expect(result.foods[0].name).toBe('米饭');
  expect(result.totalEstimate).toEqual([150, 250]);
});

test('recognizeFood throws on invalid response', async () => {
  mockFetch.mockResolvedValueOnce({
    json: async () => ({ choices: [{ message: { content: 'not json' } }] }),
  });
  const { recognizeFood } = await import('../src/services/zhipu');
  await expect(recognizeFood('fake')).rejects.toThrow('GLM 响应解析失败');
});

test('generateExercisePlan returns parsed exercise items', async () => {
  mockFetch.mockResolvedValueOnce({
    json: async () => ({
      choices: [{
        message: {
          content: '[{"id":"1","name":"跑步","type":"cardio","duration":30,"caloriesBurned":200,"description":"户外慢跑"}]',
        },
      }],
    }),
  });

  const { generateExercisePlan } = await import('../src/services/zhipu');
  const result = await generateExercisePlan({
    weight: 70,
    goalWeight: 65,
    targetDays: 30,
    tdee: 2200,
  });
  expect(result).toHaveLength(1);
  expect(result[0].name).toBe('跑步');
  expect(result[0].type).toBe('cardio');
});

test('generateExercisePlan throws on invalid response', async () => {
  mockFetch.mockResolvedValueOnce({
    json: async () => ({ choices: [{ message: { content: 'invalid json' } }] }),
  });
  const { generateExercisePlan } = await import('../src/services/zhipu');
  await expect(generateExercisePlan({
    weight: 70,
    goalWeight: 65,
    targetDays: 30,
    tdee: 2200,
  })).rejects.toThrow('GLM 运动计划解析失败');
});
