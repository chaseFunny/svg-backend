import {
    Body,
    Controller,
    Get,
    HttpStatus,
    Post,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";

import { LoggerService, RestrictedGuard } from "../../common";

import { UserPipe } from "../flow";
import { UserData, UserInput } from "../model";
import { UserService } from "../service";

@Controller("svg-generator/users")
@ApiTags("users")
@ApiBearerAuth()
export class UserController {
    public constructor(
        private readonly logger: LoggerService,
        private readonly userService: UserService
    ) {}

    @Get()
    @UseGuards(RestrictedGuard)
    @ApiOperation({ summary: "Find users" })
    @ApiResponse({ status: HttpStatus.OK, isArray: true, type: UserData })
    public async findUsers(): Promise<UserData[]> {
        return this.userService.findAll();
    }

    @Post()
    @ApiOperation({ summary: "Create user" })
    @ApiResponse({ status: HttpStatus.CREATED, type: UserData })
    public async createUser(
        @Body(UserPipe) input: UserInput
    ): Promise<UserData> {
        const user = await this.userService.create(input);
        this.logger.info(`Created new user with ID ${user.id}`);
        return user;
    }
}
