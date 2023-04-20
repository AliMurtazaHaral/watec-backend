import { Body, Controller, HttpCode, HttpStatus, Injectable, ParseIntPipe, Post, Req } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthDto } from "./dto";

@Controller('auth')
export class AuthController {
    constructor(private authService : AuthService) {

        
    }
    @HttpCode(HttpStatus.OK)
    @Post('signup')
    signup(@Body() dto: AuthDto) {
        return this.authService.signup(dto);
    }

    @Post('signin')
    signin(@Body() dto: AuthDto) {
        console.log(dto);
        return this.authService.signin(dto);
    }
}