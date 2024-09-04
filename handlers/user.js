const mongoose = require("mongoose");

const userResumeHandler = async (req, res) => {
    const user = req.user;
    const { role } = req.params;

    if (req.method === "GET") {
        return res.status(200).json({
            success: true,
            message: "User's resume",
            data: {
                role: role,
                resume: user.resume[role],
            },
        });
    }

    if (req.method === "POST") {
        try {
            if (!req.file) {
                return res.status(400).send("No PDF file uploaded");
            }

            const pdfData = req.file.buffer;

            // Save using mongoose

            res.status(200).send("PDF uploaded successfully");
        } catch (error) {
            console.error("Error uploading PDF:", error);
            res.status(500).send("Internal server error");
        }
    }
};

module.exports = {
    userResumeHandler,
};
