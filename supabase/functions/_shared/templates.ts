// SMS message templates for different OTP purposes

export const smsMessages: Record<string, (otp: string) => string> = {
  registration: (otp) =>
    `Ekrishi: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code.`,

  login: (otp) =>
    `Ekrishi: Your login code is ${otp}. Valid for 5 minutes.`,

  password_reset: (otp) =>
    `Ekrishi: Your password reset code is ${otp}. Valid for 10 minutes. Do not share.`,

  mobile_verify: (otp) =>
    `Ekrishi: Your mobile verification code is ${otp}. Valid for 5 minutes.`,

  email_verify: (otp) =>
    `Ekrishi: Your email verification code is ${otp}. Valid for 5 minutes.`,

  mobile_change: (otp) =>
    `Ekrishi: Your mobile change code is ${otp}. Valid for 10 minutes.`,

  email_change: (otp) =>
    `Ekrishi: Your email change code is ${otp}. Valid for 10 minutes.`,
};

export const emailSubjects: Record<string, string> = {
  registration: "Verify Your Ekrishi Account",
  login: "Your Ekrishi Login Code",
  password_reset: "Reset Your Ekrishi Password",
  mobile_verify: "Verify Your Mobile Number - Ekrishi Nepal",
  email_verify: "Verify Your Email Address - Ekrishi Nepal",
  mobile_change: "Verify Your New Mobile Number - Ekrishi Nepal",
  email_change: "Verify Your New Email Address - Ekrishi Nepal",
};
