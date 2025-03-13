import * as Joi from "joi";
import { JoiValidationPipe } from "../../common";
import { LoginDto } from "../model";

export class LoginPipe extends JoiValidationPipe {
    public buildSchema(): Joi.Schema {
        return Joi.object<LoginDto>({
            emailOrUsername: Joi.string().required(),
            password: Joi.string().required(),
        });
    }
}
