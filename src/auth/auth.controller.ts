import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './auth-guard/local-auth.guard';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() body) {
    const user = await this.createUser(body.userId, body.password);
    return this.authService.login({ userId: user.userId });
  }

  private async createUser(userId: string, password: string) {
    const createUserDto: CreateUserDto = {
      userId: userId,
      password: password,
    };
    return await this.usersService.create(createUserDto);
  }
}
