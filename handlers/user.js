import { sendQueueMessage } from "../utils/queue-manager.js";

const getResumeHandler = async (req, res) => {
    const user = req.user;
    const { role } = req.params;

    if (user.interviews.length == 0) {
        return res.status(404).json({
            success: false,
            message: "No resume found",
            data: null,
        });
    }

    return res.status(200).json({
        success: true,
        message: "User's resume",
        data: {
            role: role,
            resume: user.interviews,
        },
    });
};

const uploadResumeHandler = async (req, res) => {
    const user = req.user;
    const { role } = req.params;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No resume was attached",
                data: null,
            });
        }

        const pdfData = req.file.buffer;

        // TODO: Save using mongoose

        await sendQueueMessage("resume-upload", user.email);

        res.status(200).json({
            success: true,
            message: "Resume uploaded succesfully",
            data: {},
        });
    } catch (error) {
        console.error("Error uploading PDF:", error);
        res.status(500).json({
            success: false,
            message: "An error occured when trying to upload the resume",
            data: null,
        });
    }
};

export { getResumeHandler, uploadResumeHandler };
