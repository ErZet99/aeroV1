import { describe, it, expect } from 'vitest';
import { businessDaysBetween, calendarDaysSince } from '@/lib/businessDays';

describe('businessDays', () => {
  it('should skip weekends', () => {
    // 2026-07-06 is Monday, 2026-07-10 is Friday
    // Days after Monday up to Friday: Tue(7), Wed(8), Thu(9), Fri(10) = 4 business days
    const result = businessDaysBetween('2026-07-06', '2026-07-10', []);
    expect(result).toBe(4);
  });

  it('should skip holidays', () => {
    // 2026-07-02 is Thursday, 2026-07-07 is Tuesday
    // If 2026-07-04 is a holiday (Saturday), need to count Fri(3), and Tue(7) = 2 days
    // But let's use simpler dates: 2026-06-30 is Tuesday, 2026-07-03 is Friday
    // Days: Wed(1), Thu(2), Fri(3) = 3. But if 2026-07-02 is holiday: Wed(1), Fri(3) = 2
    const result = businessDaysBetween('2026-06-30', '2026-07-03', ['2026-07-02']);
    expect(result).toBe(2);
  });

  it('same day returns 0', () => {
    const result = businessDaysBetween('2026-07-07', '2026-07-07', []);
    expect(result).toBe(0);
  });

  it('calendarDaysSince calculates days correctly', () => {
    const result = calendarDaysSince('2026-07-01', '2026-07-08');
    expect(result).toBe(7);
  });
});
