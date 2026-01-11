import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { UsersService } from '../users/users.service';
import { FirebaseService } from './firebase.service';
import { of } from 'rxjs';

describe('AuthService (tenant-admin checks)', () => {
  let service: AuthService;
  let usersService: Partial<Record<string, jest.Mock>> & any;
  let jwtService: Partial<Record<string, jest.Mock>> & any;
  let httpService: Partial<Record<string, jest.Mock>> & any;

  beforeEach(async () => {
    usersService = {
      validatePassword: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    };

    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };
    httpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: HttpService, useValue: httpService },
        { provide: FirebaseService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('returns tenant_admin login when existing user email is a tenant admin', async () => {
    const user = { id: 1, email: 'admin123@example.com', tenantUuid: '94d5d870-4597-4bcb-9d5c-d13d6df0e645' };
    usersService.validatePassword.mockResolvedValue(user);
    httpService.get.mockReturnValue(of({ data: { isAdmin: true, tenantUuid: user.tenantUuid } }));

    const result = await service.login({ email: user.email, password: 'whatever' } as any);

    expect(httpService.get).toHaveBeenCalled();
    expect(jwtService.sign).toHaveBeenCalled();
    expect(result.user.loginType).toBe('tenant_admin');
    expect(result.user.tenantUuid).toBe(user.tenantUuid);
  });

  it('associates tenantUuid and returns tenant_admin when user exists without tenantUuid', async () => {
    const user = { id: 2, email: 'admin123@example.com', tenantUuid: null };
    const associatedUser = { id: 2, email: 'admin123@example.com', tenantUuid: '94d5d870-4597-4bcb-9d5c-d13d6df0e645' };

    usersService.validatePassword.mockResolvedValue(user);
    usersService.update.mockResolvedValue(true);
    usersService.findByEmail.mockResolvedValue(associatedUser);
    httpService.get.mockReturnValue(of({ data: { isAdmin: true, tenantUuid: associatedUser.tenantUuid } }));

    const result = await service.login({ email: user.email, password: 'pass' } as any);

    expect(usersService.update).toHaveBeenCalledWith(user.id, { tenantUuid: associatedUser.tenantUuid });
    expect(result.user.loginType).toBe('tenant_admin');
    expect(result.user.tenantUuid).toBe(associatedUser.tenantUuid);
  });
});
