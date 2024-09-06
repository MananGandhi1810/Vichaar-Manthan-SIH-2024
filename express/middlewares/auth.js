import { User } from "../db/model.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();
const jwtSecret = process.env.JWT_SECRET;

const checkAuth = async (req, res, next) => {
    const { authorization } = req.headers;
    if (!authorization) {
        return res.status(401).json({
            success: false,
            message: "Authorization header is missing",
            data: null,
        });
    }
    const token = authorization.replace("Bearer ", "");
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authorization bearer token is missing",
            data: null,
        });
    }
    var jwtUser;
    try {
        jwtUser = jwt.verify(token, jwtSecret);
    } catch (e) {
        console.log(e);
        return res.status(500).send({
            success: false,
            message: "There was an error in verifying your account",
            data: null,
        });
    }
    if (!jwtUser) {
        return res.status(500).send({
            success: false,
            message: "There was an error in verifying your account",
            data: null,
        });
    }
    const user = await User.findOne({ email: jwtUser.email });
    if (!user) {
        return res.status(400).send({
            success: false,
            message: "This account does not exist",
            data: null,
        });
    }
    user.password = undefined;
    user._id = undefined;
    user.__v = undefined;
    req.user = user;
    next();
};

export { checkAuth };
