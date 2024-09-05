import jwt from "jsonwebtoken";
import { User } from "../db/model.js";

const jwtSecret = process.env.JWT_SECRET

const getUser = async (token) => {
    var jwtUser;
    try {
        jwtUser = jwt.verify(token, jwtSecret);
    } catch (e) {
        console.log(e);
        return null;
    }
    if (!jwtUser) {
        return null;
    }
    const user = await User.findOne({ email: jwtUser.email });
    if (!user) {
        return null;
    }
    user.password = undefined;
    user._id = undefined;
    user.__v = undefined;
    return user;
};

export { getUser };
