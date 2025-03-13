import { SetMetadata } from "@nestjs/common";

/**
 * 标记一个路由为公开，不需要认证
 * 使用方法：@Public()
 */
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
