// SMS message templates for different OTP purposes

export const smsMessages: Record<string, (otp: string) => string> = {
  registration: (otp) =>
    `AgriConnect: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code.`,

  login: (otp) =>
    `AgriConnect: Your login code is ${otp}. Valid for 5 minutes.`,

  password_reset: (otp) =>
    `AgriConnect: Your password reset code is ${otp}. Valid for 10 minutes. Do not share.`,

  mobile_verify: (otp) =>
    `AgriConnect: Your mobile verification code is ${otp}. Valid for 5 minutes.`,

  email_verify: (otp) =>
    `AgriConnect: Your email verification code is ${otp}. Valid for 5 minutes.`,

  mobile_change: (otp) =>
    `AgriConnect: Your mobile change code is ${otp}. Valid for 10 minutes.`,

  email_change: (otp) =>
    `AgriConnect: Your email change code is ${otp}. Valid for 10 minutes.`,
};

export const emailSubjects: Record<string, string> = {
  registration: "Verify Your AgriConnect Account",
  login: "Your AgriConnect Login Code",
  password_reset: "Reset Your AgriConnect Password",
  mobile_verify: "Verify Your Mobile Number - AgriConnect Nepal",
  email_verify: "Verify Your Email Address - AgriConnect Nepal",
  mobile_change: "Verify Your New Mobile Number - AgriConnect Nepal",
  email_change: "Verify Your New Email Address - AgriConnect Nepal",
};
