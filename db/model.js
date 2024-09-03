import { model, Schema } from "mongoose";
import {
  validateEmail,
  validatePhoneNumber,
} from "../utils/validators";

const userSchema = new Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    validate: (val) => validateEmail(val),
    unique: true,
    required: true,
  },
  password: { type: String, required: true },
  phoneNum: {
    type: String,
    validate: (val) => validatePhoneNumber(val),
    unique: true,
    required: true,
  },
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

const User = model("User", userSchema);

export { User };
