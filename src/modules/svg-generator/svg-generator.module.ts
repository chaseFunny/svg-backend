import { Module } from "@nestjs/common";

import { CommonModule } from "../common";
import { SvgGeneratorController } from "./controller";
import { SvgGenerationService, UserService } from "./service";

@Module({
    imports: [CommonModule],
    providers: [SvgGenerationService, UserService],
    controllers: [SvgGeneratorController],
    exports: [],
})
export class SvgGeneratorModule {}
