import { TransformInterceptor } from './transform.interceptor';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('wraps data in statusCode + data envelope', (done) => {
    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as any;

    const mockHandler = {
      handle: () => of({ id: '123' }),
    } as any;

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result).toEqual({ statusCode: 200, data: { id: '123' } });
      done();
    });
  });

  it('returns null data when handler returns undefined', (done) => {
    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 204 }),
      }),
    } as any;

    const mockHandler = {
      handle: () => of(undefined),
    } as any;

    interceptor.intercept(mockContext, mockHandler).subscribe((result) => {
      expect(result).toEqual({ statusCode: 204, data: null });
      done();
    });
  });
});
