
const { Module } = require("@nestjs/common");
const { JwtModule, JwtService } = require("@nestjs/jwt");

const DatabaseModule = require("../database/database.module");
const DatabaseService = require("../database/database.service");

const { AuthService } = require("./auth.service");
const AuthController = require("./auth.controller");
const JwtAuthGuard = require("./jwt-auth.guard");
const RolesGuard = require("./roles.guard");

class AuthModule {}

Module({
    imports: [
        DatabaseModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: {
                expiresIn: "8h"
            }
        })
    ],

    controllers: [AuthController],

    providers: [
        {
            provide: AuthService,
            useFactory: (database, jwtService) => {
                return new AuthService(database, jwtService);
            },
            inject: [
                DatabaseService,
                JwtService
            ]
        },

        JwtAuthGuard,
        RolesGuard
    ],

    exports: [
        AuthService,
        JwtAuthGuard,
        RolesGuard,
        JwtModule
    ]
})(AuthModule);

module.exports = AuthModule;
