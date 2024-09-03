import { Schema } from "mongoose";
import {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
} from "../utils/validators";

const userSchema = new Schema({
  name: { type: String },
  email: { type: String, validate: (val) => validateEmail(val) },
  password: { type: String, validate: (val) => validatePassword(val) },
  phoneNum: { type: String, validate: (val) => validatePhoneNumber(val) },
  salt: String,
  interviews: [
    {
      role: String,
      resume: Buffer,
      time: {
        type: Data,
        default: Date.now,
      },
      questions: [
        {
          question: String,
          userAnswer: String,
          expectedAnswer: String,
        },
      ],
      feedback: String,
      rating: Number,
    },
  ],
});

export { userSchema };
