// SMS message templates for different OTP purposes

export const smsMessages: Record<string, (otp: string) => string> = {
  registration: (otp) =>
    `KrishiConnect: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code.`,

  login: (otp) =>
    `KrishiConnect: Your login code is ${otp}. Valid for 5 minutes.`,

  password_reset: (otp) =>
    `KrishiConnect: Your password reset code is ${otp}. Valid for 10 minutes. Do not share.`,

  mobile_verify: (otp) =>
    `KrishiConnect: Your mobile verification code is ${otp}. Valid for 5 minutes.`,

  email_verify: (otp) =>
    `KrishiConnect: Your email verification code is ${otp}. Valid for 5 minutes.`,

  mobile_change: (otp) =>
    `KrishiConnect: Your mobile change code is ${otp}. Valid for 10 minutes.`,

  email_change: (otp) =>
    `KrishiConnect: Your email change code is ${otp}. Valid for 10 minutes.`,
};

export const emailSubjects: Record<string, string> = {
  registration: "Verify Your KrishiConnect Account",
  login: "Your KrishiConnect Login Code",
  password_reset: "Reset Your KrishiConnect Password",
  mobile_verify: "Verify Your Mobile Number",
  email_verify: "Verify Your Email Address",
  mobile_change: "Verify Your New Mobile Number",
  email_change: "Verify Your New Email Address",
};
