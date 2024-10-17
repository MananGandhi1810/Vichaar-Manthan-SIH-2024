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
    const generatedId = dbUser.interviews[dbUser.interviews.length - 1]._id;
    dbUser.save();

    await sendQueueMessage(
      "resume-upload",
      JSON.stringify({
        name: user.name,
        email: user.email,
        role: role,
        id: generatedId,
      }),
    );

    res.status(200).json({
      success: true,
      message: "Resume uploaded succesfully",
      data: {
        resumeId: generatedId,
      },
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

  if (!userQuestions.isResumeProcessed) {
    return res.status(404).json({
      success: false,
      message: "Resume is being processed",
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
  const { answer } = req.body;

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

  if (!userQuestions.isResumeProcessed) {
    return res.status(404).json({
      success: false,
      message: "Resume is being processed",
      data: null,
    });
  }

  if (index >= userQuestions.questions.length) {
    return res.status(400).json({
      success: false,
      message: "Invalid question index",
      data: null,
    });
  }

  if (!answer) {
    return res.status(400).json({
      success: false,
      message: "Answer cannot be empty",
      data: null,
    });
  }

  userQuestions.questions[index].userAnswer = answer;

  dbUser.save();

  if (userQuestions.questions.filter((e) => e.userAnswer == "").length == 0) {
    await sendQueueMessage(
      "feedback-request",
      JSON.stringify({
        name: user.name,
        email: user.email,
        role: role,
        id: id,
      }),
    );
  }

  return res.status(200).json({
    success: true,
    message: "Answer saved",
    data: {},
  });
};

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

  if (!userQuestions.isResumeProcessed) {
    return res.status(404).json({
      success: false,
      message: "Resume is being processed",
      data: null,
    });
  }

  if (userQuestions.questions.filter((e) => e.userAnswer == null).length > 0) {
    return res.status(404).json({
      success: false,
      message: "Answers are not completed",
      data: null,
    });
  }

  if (!userQuestions.feedback) {
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
      rating: userQuestions.rating,
    },
  });
};

export {
  getResumeHandler,
  getResumeWithIdHandler,
  uploadResumeHandler,
  getQuestionsHandler,
  setAnswerHandler,
  getFeedbackHandler,
};
