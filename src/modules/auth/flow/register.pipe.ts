import * as Joi from "joi";
import { JoiValidationPipe } from "../../common";
import { UserData } from "../../svg-generator/model";
import { RegisterDto } from "../model";

export class RegisterPipe extends JoiValidationPipe {
    public buildSchema(): Joi.Schema {
        return Joi.object<RegisterDto>({
            username: Joi.string().required().max(UserData.USERNAME_LENGTH),
            email: Joi.string().email().required(),
            password: Joi.string().min(6).required(),
            verificationCode: Joi.string().required().length(6),
            inviteCode: Joi.string().optional(),
        });
    }
}
