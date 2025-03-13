import * as Joi from "joi";
import { JoiValidationPipe } from "../../common";
import { SendVerificationCodeDto } from "../model";

export class SendVerificationCodePipe extends JoiValidationPipe {
    public buildSchema(): Joi.Schema {
        return Joi.object<SendVerificationCodeDto>({
            email: Joi.string().email().required(),
        });
    }
}
