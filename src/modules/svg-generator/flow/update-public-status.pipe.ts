import * as Joi from "joi";

import { JoiValidationPipe } from "../../common";
import { UpdatePublicStatusDto } from "../model";

/**
 * 用于验证SVG公开状态更新请求的管道
 */
export class UpdatePublicStatusPipe extends JoiValidationPipe {
    public buildSchema(): Joi.Schema {
        return Joi.object<UpdatePublicStatusDto>({
            isPublic: Joi.boolean().required(),
        });
    }
}
