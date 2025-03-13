import * as Joi from "joi";
import { JoiValidationPipe } from "../../common";
import { VerifyEmailDto } from "../model";

export class VerifyEmailPipe extends JoiValidationPipe {
    public buildSchema(): Joi.Schema {
        return Joi.object<VerifyEmailDto>({
            email: Joi.string().email().required(),
            code: Joi.string().required().length(6),
        });
    }
}
