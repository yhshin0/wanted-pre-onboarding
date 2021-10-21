import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('../users/users.service');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UsersService,
        { provide: JwtService, useValue: { sign: jest.fn(() => 'TOKEN') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('로그인 시 토큰을 반환한다', async () => {
    const userId = 'testuser';
    const token = 'TOKEN';
    jest.spyOn(jwtService, 'sign').mockReturnValue(token);
    const res = await service.login({ userId });
    expect(res.access_token).toEqual(token);
  });

  it('올바른 유저인지 검증한다', async () => {
    expect.assertions(2);
    const id = 1;
    const userId = 'testuser';
    const password = 'password';
    const hashPassword = 'hashPassword';
    jest
      .spyOn(usersService, 'findOne')
      .mockResolvedValue({ id, userId, password });
    jest.spyOn(usersService, 'compareHash').mockResolvedValue(hashPassword);
    const res = await service.validateUser(userId, password);
    expect(res.id).toEqual(id);
    expect(res.userId).toEqual(userId);
  });
});
