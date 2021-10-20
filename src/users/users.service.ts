import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private saltRounds = 10;
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.checkEmptyIdAndPassword(createUserDto);

    const existedUser = await this.findOne(createUserDto.userId);
    if (existedUser) {
      throw new HttpException(
        { message: 'userId already exists' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = new User();
    user.userId = createUserDto.userId;
    user.password = await bcrypt.hash(createUserDto.password, this.saltRounds);
    return await this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async findOne(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { userId: userId },
    });
    return user;
  }

  async compareHash(user: User, password: string) {
    return await bcrypt.compare(password, user.password);
  }

  private checkEmptyIdAndPassword(createUserDto: CreateUserDto) {
    if (!createUserDto.userId || !createUserDto.password) {
      throw new HttpException(
        { message: 'Invalid userId/password' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
