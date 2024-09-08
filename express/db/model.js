import { model, Schema } from "mongoose";
import { validateEmail, validatePhoneNumber } from "../utils/validators.js";
import { generate } from "../utils/random-gen.js";

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
    interviews: [
        {
            id: { type: Number, required: true, default: () => generate(6) },
            role: { type: String, required: true },
            resumeName: { type: String, required: true },
            resumeData: { type: Buffer, required: true },
            isResumeProcessed: {
                type: Boolean,
                default: () => false,
            },
            time: {
                type: Date,
                default: Date.now,
            },
            questions: [
                {
                    question: String,
                    userAnswer: String,
                    expectedAnswer: String,
                },
            ],
            feedback: { type: String, default: "" },
            rating: { type: Number, default: 0.0 },
        },
    ],
});

const User = model("User", userSchema);

export { User };
