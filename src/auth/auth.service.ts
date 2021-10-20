import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(userId: string, password: string) {
    const user = await this.usersService.findOne(userId);
    if (user && (await this.usersService.compareHash(user, password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { userId: user.userId };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(body: any) {
    const payload = { userId: body.userId };

    this.checkEmptyIdAndPassword(body);
    this.checkExistedUser(body.userId);
    this.createUser(body.userId, body.password);

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  private checkEmptyIdAndPassword(body) {
    if (!body && !body.userId && !body.password) {
      throw new HttpException(
        { message: 'Invalid data' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async checkExistedUser(userId: string) {
    const existedUser = await this.usersService.findOne(userId);
    if (existedUser) {
      throw new HttpException(
        { message: `id(${userId}) already exists` },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async createUser(userId: string, password: string) {
    const createUserDto: CreateUserDto = {
      userId: userId,
      password: password,
    };
    await this.usersService.create(createUserDto);
  }
}
