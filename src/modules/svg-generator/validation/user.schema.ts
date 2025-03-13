import * as Joi from "joi";

export const userSchema = Joi.object({
    username: Joi.string().required(),
    email: Joi.string().email().optional(),
    password: Joi.string().min(6).required(),
    wechatOpenId: Joi.string().optional(),
    miniappOpenId: Joi.string().optional(),
});
