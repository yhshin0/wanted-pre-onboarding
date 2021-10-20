import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthService } from "../auth.service";

@Injectable()
export class LoaclStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: "userId",
      passwordField: "password",
    });
  }

  async validate(userId: string, password: string) {
    const user = await this.authService.validateUser(userId, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}