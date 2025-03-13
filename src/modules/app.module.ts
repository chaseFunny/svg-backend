import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { CommonModule } from "./common";
import { SvgGeneratorModule } from "./svg-generator/svg-generator.module";

@Module({
    imports: [CommonModule, SvgGeneratorModule, AuthModule],
})
export class ApplicationModule {}
