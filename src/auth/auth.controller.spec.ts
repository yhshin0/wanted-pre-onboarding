import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

jest.mock('./auth.service');
jest.mock('../users/users.service');

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthService, UsersService],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('회원 등록을 진행한다', async () => {
    const userId = 'testuser';
    const password = 'password';
    const body = { userId, password };
    const loginResult = { access_token: 'TOKEN' };
    jest
      .spyOn(usersService, 'create')
      .mockResolvedValue({ id: 1, userId, password });
    jest.spyOn(authService, 'login').mockResolvedValue(loginResult);
    const res = await controller.register(body);
    expect(res).toEqual(loginResult);
  });

  it('로그인을 진행한다', async () => {
    const userId = 'testuser';
    const password = 'password';
    const req = { user: { userId, password } };
    const loginResult = { access_token: 'TOKEN' };
    jest.spyOn(authService, 'login').mockResolvedValue(loginResult);
    const res = await controller.login(req);
    expect(res).toEqual(loginResult);
  });
});
