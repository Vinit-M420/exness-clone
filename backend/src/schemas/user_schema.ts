import { z } from "zod";

export const UserSignupSchema = z.object({
        name: z.string().min(3).max(20),
        email: z.email().min(8).max(20, { message: "Invalid email format" }),
        password: z.string()
                  .min(8, { message: "Password must be at least 8 characters" })
                  .max(20, { message: "Password must be at most 20 characters" })
                  .refine((password) => {
                    const hasUppercase = /[A-Z]/.test(password);
                    const hasLowercase = /[a-z]/.test(password);
                    const hasNumber = /[0-9]/.test(password);
                    const hasSpecialCharacter = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
                  return hasUppercase && hasLowercase && hasNumber && hasSpecialCharacter;
            },{
            message: "Password must contain at least one uppercase, lowercase, number, and special character"
        })
    })

export const UserSigninSchema = UserSignupSchema.pick({
  email: true,
  password: true,
});

export const UpdatePwdSchema =  UserSignupSchema.pick({ password: true });
export const UpdateNameSchema = UserSignupSchema.pick({ name: true });
export const UpdateEmailSchema = UserSignupSchema.pick({ email: true });