import crypto from "node:crypto";

const generate = (len) => {
    return crypto.randomInt(Math.pow(10, len - 1), Math.pow(10, len));
};

export { generate };
