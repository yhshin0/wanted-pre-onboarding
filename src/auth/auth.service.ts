import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async validateUser(userId: string, password: string) {
    const user = await this.usersService.findOne(userId);
    if (user && (await this.usersService.compareHash(user, password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
}
