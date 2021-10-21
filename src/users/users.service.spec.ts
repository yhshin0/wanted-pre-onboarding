import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

const mockUserRepository = () => ({
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
});

//Repository를 Mocking 하기 위한 type
type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: MockRepository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository() },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<MockRepository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('초기 상태에는 유저가 없다', async () => {
    userRepository.find.mockResolvedValue([]);
    expect(await service.findAll()).toEqual([]);
  });

  it('유저 생성 후 조회한다', async () => {
    expect.assertions(3);
    const userId = 'testuser';
    const password = 'password';
    const createUserDto = { userId, password };
    userRepository.save.mockResolvedValue({ id: 1, ...createUserDto });
    const user = await service.create(createUserDto);
    userRepository.findOne.mockResolvedValue({ id: 1, ...createUserDto });
    const expectUser = await service.findOne(userId);

    expect(expectUser.id).toBe(user.id);
    expect(expectUser.userId).toBe(user.userId);
    expect(expectUser.password).toBe(user.password);
  });

  it('userId가 빈 경우 400 상태 코드를 반환한다', async () => {
    expect.assertions(2);
    const userId = '';
    const password = 'password';
    const createUserDto = { userId, password };
    try {
      const user = await service.create(createUserDto);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.status).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('password가 빈 경우 400 상태 코드를 반환한다', async () => {
    expect.assertions(2);
    const userId = 'testuser';
    const password = '';
    const createUserDto = { userId, password };
    try {
      const user = await service.create(createUserDto);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.status).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('userId가 중복되는 경우 400 상태 코드를 반환한다', async () => {
    expect.assertions(2);
    const userId = 'testuser';
    const password = 'password';
    const createUserDto = { userId, password };
    userRepository.save.mockResolvedValue({ id: 1, ...createUserDto });
    const user = await service.create(createUserDto);
    try {
      userRepository.findOne.mockResolvedValue(user);
      const duplicateUser = await service.create(createUserDto);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.status).toBe(HttpStatus.BAD_REQUEST);
    }
  });
});
