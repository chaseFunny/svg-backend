import * as Joi from "joi";

import { JoiValidationPipe } from "../../common";
import { SvgGenerationInput } from "../model";

export class SvgGenerationPipe extends JoiValidationPipe {
    public buildSchema(): Joi.Schema {
        return Joi.object<SvgGenerationInput>({
            inputContent: Joi.string().required(),
            style: Joi.string().optional(),
            aspectRatio: Joi.string().optional(),
            isThinking: Joi.string().valid("base", "thinking").default("base"),
            image: Joi.alternatives()
                .try(Joi.string(), Joi.binary(), Joi.object())
                .optional(),
            file: Joi.alternatives()
                .try(Joi.string(), Joi.binary(), Joi.object())
                .optional(),
            configuration: Joi.object().optional(),
        });
    }
}
