import * as Joi from "joi";

import { JoiValidationPipe } from "../../common";
import { UserData, UserInput } from "../model";

export class UserPipe extends JoiValidationPipe {
    public buildSchema(): Joi.Schema {
        return Joi.object<UserInput>({
            username: Joi.string().required().max(UserData.USERNAME_LENGTH),
            email: Joi.string().email().optional(),
            wechatOpenId: Joi.string().optional(),
            miniappOpenId: Joi.string().optional(),
        });
    }
}
