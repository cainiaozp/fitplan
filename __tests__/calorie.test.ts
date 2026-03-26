import { calculateBMR, calculateTDEE, calculateDailyTarget } from '../src/utils/calorie';

describe('BMR calculation', () => {
  test('male BMR calculation', () => {
    // 体重75kg, 身高175cm, 年龄30岁
    // BMR = 10*75 + 6.25*175 - 5*30 + 5 = 1698.75
    const bmr = calculateBMR(75, 175, 30, 'male');
    expect(bmr).toBeCloseTo(1698.75, 0);
  });

  test('female BMR calculation', () => {
    // 体重60kg, 身高165cm, 年龄25岁
    // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 1345.25
    const bmr = calculateBMR(60, 165, 25, 'female');
    expect(bmr).toBeCloseTo(1345.25, 0);
  });
});

describe('TDEE calculation', () => {
  test('moderate activity multiplier', () => {
    const tdee = calculateTDEE(1706, 'moderate');
    expect(tdee).toBeCloseTo(2644, 0);
  });
});

describe('Daily calorie target', () => {
  test('safe deficit of 500kcal', () => {
    const target = calculateDailyTarget(2644);
    expect(target).toBe(2144);
  });
});
