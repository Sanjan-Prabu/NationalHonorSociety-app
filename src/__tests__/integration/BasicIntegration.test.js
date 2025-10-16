/**
 * Basic Integration Test
 * 
 * Simple test to verify the testing setup is working
 */

describe('Basic Integration Test', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should have access to basic JavaScript features', () => {
    const testArray = [1, 2, 3];
    const doubled = testArray.map(x => x * 2);
    expect(doubled).toEqual([2, 4, 6]);
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve('test');
    const result = await promise;
    expect(result).toBe('test');
  });

  it('should mock functions correctly', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});