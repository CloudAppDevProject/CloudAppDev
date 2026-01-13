import { TenantAuthGuard } from './tenant-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('TenantAuthGuard (tenant-service)', () => {
  let guard: TenantAuthGuard;
  const mockJwtService = { verifyAsync: jest.fn() } as any;

  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.ALLOW_TENANTID_FALLBACK;
    guard = new TenantAuthGuard(mockJwtService);
    jest.spyOn((guard as any).logger, 'warn').mockImplementation(() => {});
  });

  it('uses tenantUuid when present', async () => {
    mockJwtService.verifyAsync.mockResolvedValue({ userId: 1, email: 'a@b', tenantUuid: 'uuid-1', loginType: 'user' });
    const request: any = { headers: { authorization: 'Bearer token' } };
    const ctx = { switchToHttp: () => ({ getRequest: () => request }) } as any as ExecutionContext;

    const ok = await guard.canActivate(ctx);
    expect(ok).toBe(true);
    expect(request.tenantUuid).toBe('uuid-1');
  });

  it('falls back to tenantId when ALLOW_TENANTID_FALLBACK=true', async () => {
    process.env.ALLOW_TENANTID_FALLBACK = 'true';
    mockJwtService.verifyAsync.mockResolvedValue({ userId: 1, email: 'a@b', tenantId: 'legacy-1', loginType: 'user' });
    const request: any = { headers: { authorization: 'Bearer token' } };
    const ctx = { switchToHttp: () => ({ getRequest: () => request }) } as any as ExecutionContext;

    const warnSpy = jest.spyOn((guard as any).logger, 'warn');
    const ok = await guard.canActivate(ctx);

    expect(ok).toBe(true);
    expect(request.tenantUuid).toBe('legacy-1');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('ignores tenantId when fallback disabled', async () => {
    delete process.env.ALLOW_TENANTID_FALLBACK;
    mockJwtService.verifyAsync.mockResolvedValue({ userId: 1, email: 'a@b', tenantId: 'legacy-2', loginType: 'user' });
    const request: any = { headers: { authorization: 'Bearer token' } };
    const ctx = { switchToHttp: () => ({ getRequest: () => request }) } as any as ExecutionContext;

    const warnSpy = jest.spyOn((guard as any).logger, 'warn');
    const ok = await guard.canActivate(ctx);

    expect(ok).toBe(true);
    expect(request.tenantUuid).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});