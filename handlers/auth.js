import { User } from "../db/model.js";
import { hash, compare } from "../utils/hash.js";
import {
    validateEmail,
    validatePassword,
    validatePhoneNumber,
} from "../utils/validators.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const jwtSecret = process.env.JWT_SECRET;

const registerHandler = async (req, res) => {
    const { name, email, phoneNum, password } = req.body;
    if (!validateEmail(email)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email format",
            data: null,
        });
    }
    if (!validatePassword(password)) {
        return res.status(400).json({
            success: false,
            message:
                "The password must contain 8 letters, with 1 symbol, 1 lower case character, 1 upper case character, and 1 number",
            data: null,
        });
    }
    if (!validatePhoneNumber(phoneNum)) {
        return res.status(400).json({
            success: false,
            message: "Invalid Phone Number",
            data: null,
        });
    }
    const existingEmailUser = await User.findOne({ email });
    if (existingEmailUser) {
        return res.status(400).json({
            success: false,
            message: "User with that email already exists",
            data: null,
        });
    }
    const existingPhoneNumUser = await User.findOne({ phoneNum });
    if (existingPhoneNumUser) {
        return res.status(400).json({
            success: false,
            message: "User with that phone number already exists",
            data: null,
        });
    }
    const hashedPassword = await hash(password);
    const user = await User.create({
        name,
        email,
        phoneNum,
        password: hashedPassword,
    });
    user.password = undefined;
    user._id = undefined;
    user.__v = undefined;
    res.status(201).json({
        success: true,
        message: "User registered succesfully",
        data: user,
    });
};

const loginHandler = async (req, res) => {
    const { email, password } = req.body;
    if (!validateEmail(email)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email format",
            data: null,
        });
    }
    if (!validatePassword(password)) {
        return res.status(400).json({
            success: false,
            message:
                "The password must contain 8 letters, with 1 symbol, 1 lower case character, 1 upper case character, and 1 number",
            data: null,
        });
    }
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({
            success: false,
            message: "User does not exist",
            data: null,
        });
    }
    const isPasswordValid = await compare(user.password, password);
    if (!isPasswordValid) {
        return res.status(400).json({
            success: false,
            message: "Password is incorrect",
            data: null,
        });
    }
    user.password = undefined;
    user._id = undefined;
    user.__v = undefined;
    const token = jwt.sign(
        {
            name: user.name,
            email: user.email,
            phoneNum: user.phoneNum,
        },
        jwtSecret,
    );
    res.status(200).json({
        success: true,
        message: "User logged in",
        data: { user, token },
    });
};

const userDataHandler = async (req, res) => {
    res.status(200).json({
        success: true,
        message: "User found",
        data: req.user,
    });
};

export { registerHandler, loginHandler, userDataHandler };
