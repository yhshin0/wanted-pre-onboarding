import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

jest.mock('./users.service');

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [UsersService],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('초기 상태에는 유저가 없다', async () => {
    jest.spyOn(service, 'findAll').mockResolvedValue([]);
    expect(await controller.findAll()).toEqual([]);
  });

  it('유저 생성 후 조회하면 성공한다', async () => {
    const userId = 'testuser';
    const password = 'password';
    const createUserDto = { userId, password };
    jest
      .spyOn(service, 'create')
      .mockResolvedValue({ id: 1, ...createUserDto });
    const user = await service.create(createUserDto);
    jest.spyOn(service, 'findAll').mockResolvedValue([user]);
    const users = await controller.findAll();
    expect(users[0]).toEqual(user);
  });
});
