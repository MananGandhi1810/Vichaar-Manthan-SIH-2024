import { User } from "../db/model.js";
import { sendQueueMessage } from "../utils/queue-manager.js";

const getResumeHandler = async (req, res) => {
    const user = req.user;
    const { role } = req.params;

    const userResumes = user.interviews.filter((e) => e.role == role);

    if (userResumes.length == 0) {
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
            resume: userResumes.sort((a, b) => a.time - b.time)[0],
        },
    });
};

const getResumeWithIdHandler = async (req, res) => {
    const user = req.user;
    const { role, id } = req.params;

    const userResumes = user.interviews.filter(
        (e) => e.role == role && e.id == id,
    );

    if (userResumes.length == 0) {
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
            resume: userResumes.sort((a, b) => a.time - b.time)[0],
        },
    });
};

const uploadResumeHandler = async (req, res) => {
    const user = req.user;
    const { role } = req.params;

    try {
        if (!req.files.resume) {
            return res.status(400).json({
                success: false,
                message: "No resume was attached",
                data: null,
            });
        }

        const dbUser = await User.findOne({ email: user.email });
        dbUser.interviews.push({
            role: role,
            resumeData: req.files.resume.data,
            resumeName: req.files.resume.name,
        });
        dbUser.save();

        await sendQueueMessage(
            "resume-upload",
            JSON.stringify({
                email: user.email,
                role: role,
            }),
        );

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

const getQuestionsHandler = async (req, res) => {
    const user = req.user;
    const { role, id } = req.params;

    const userInterviews = user.interviews.filter(
        (e) => e.role == role && e.id == id,
    );

    if (userInterviews.length == 0) {
        return res.status(404).json({
            success: false,
            message: "No interviews found",
            data: null,
        });
    }

    const userQuestions = userInterviews.sort((a, b) => a.time - b.time)[0];

    if (
        userInterviews.sort((a, b) => a.time - b.time)[0].questions.length == 0
    ) {
        return res.status(404).json({
            success: false,
            message: "Questions are being processed",
            data: null,
        });
    }

    return res.status(200).json({
        success: true,
        message: "Questions found",
        data: {
            role: role,
            questions: userQuestions.questions,
        },
    });
};

const setAnswerHandler = async (req, res) => {
    const user = req.user;
    const { role, id, index } = req.params;
    const { answers } = req.body;

    const dbUser = await User.findOne({
        email: user.email,
    });

    const userInterviews = dbUser.interviews.filter(
        (e) => e.role == role && e.id == id,
    );

    if (userInterviews.length == 0) {
        return res.status(404).json({
            success: false,
            message: "No interviews found",
            data: null,
        });
    }

    const userQuestions = userInterviews.sort((a, b) => a.time - b.time)[0];

    if (userQuestions.questions.length == 0) {
        return res.status(404).json({
            success: false,
            message: "Questions are being processed",
            data: null,
        });
    }

    userQuestions.questions[index].answers = answers;

    dbUser.save();

    return res.status(200).json({
        success: true,
        message: "Answers saved",
        data: {},
    });
}

const getFeedbackHandler = async (req, res) => {
    const user = req.user;
    const { role, id } = req.params;

    const dbUser = await User.findOne({
        email: user.email,
    });

    const userInterviews = dbUser.interviews.filter(
        (e) => e.role == role && e.id == id,
    );

    if (userInterviews.length == 0) {
        return res.status(404).json({
            success: false,
            message: "No interviews found",
            data: null,
        });
    }

    const userQuestions = userInterviews.sort((a, b) => a.time - b.time)[0];

    if (userQuestions.questions.length == 0) {
        return res.status(404).json({
            success: false,
            message: "Questions are being processed",
            data: null,
        });
    }

    if (userQuestions.feedback == null) {
        return res.status(404).json({
            success: false,
            message: "Feedback is being processed",
            data: null,
        });
    }

    return res.status(200).json({
        success: true,
        message: "Feedback found",
        data: {
            role: role,
            feedback: userQuestions.feedback,
        },
    });
}


export {
    getResumeHandler,
    getResumeWithIdHandler,
    uploadResumeHandler,
    getQuestionsHandler,
    setAnswerHandler,
    getFeedbackHandler,
};
