import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import * as jwksRsa from "jwks-rsa";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private configService: ConfigService) {
    const domain_auth0 = configService.get<string>("AUTH0_DOMAIN");
    const api_auth0 = configService.get<string>("AUTH0_API");

    if (!domain_auth0 || !api_auth0) {
      throw new Error("Las variables de entorno no están definidas.");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        jwksUri: `https://${domain_auth0}/.well-known/jwks.json`,
        cache: true,
        rateLimit: true,
      }),
      algorithms: ["RS256"],
      audience: api_auth0,
      issuer: `https://${domain_auth0}/`,
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      providerId: payload.sub.split('|')[1],
      email: payload.email || `${payload.sub}`,
      roles: payload[`${this.configService.get("AUTH0_API")}/roles`] || []
    };
  }
}
