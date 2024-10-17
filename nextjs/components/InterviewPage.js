"use client";

import React, { useEffect, useState } from "react";
import { useNextjsAudioToTextRecognition } from "nextjs-audio-to-text-recognition";
import Webcam from "react-webcam";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";

function InterviewPage() {
  const router = useRouter();
  const { isListening, transcript, startListening, stopListening } =
    useNextjsAudioToTextRecognition({ lang: "en-IN", continuous: true });

  const [question, setQuestion] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [interviewFinished, setInterviewFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  const userData = JSON.parse(sessionStorage.getItem("userData"));
  const authToken = sessionStorage.getItem("authToken");
  const { selectedRole, id } = userData || {};

  // Fetch questions for the selected role
  useEffect(() => {
    let intervalId;

    const fetchQuestions = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/user/questions/${selectedRole}/${id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();

          setQuestions(data.data.questions.map((e) => e.question));
          setQuestion(data.data.questions[0].question);
          setLoading(false);
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error("Failed to fetch questions:", error);
      }
    };

    fetchQuestions();
    intervalId = setInterval(fetchQuestions, 3000);

    return () => clearInterval(intervalId);
  }, [selectedRole, id]);

  const handleBeforeUnload = (e) => {
    e.preventDefault();
    e.returnValue = "";
  };

  // Prevent user from leaving the page during the interview process
  useEffect(() => {
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("contextmenu", (e) => e.preventDefault());
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Alert user if they try to leave the page during the interview
  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      alert(
        "You are not allowed to leave the page during the interview. Please complete the interview.",
      );
    }
  };

  // Handle the next question
  const handleNextQuestion = async () => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/questions/${selectedRole}/${id}/${questionIndex}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ answer: transcript }),
        },
      );

      const newIndex = questionIndex + 1;

      if (newIndex < questions.length) {
        stopListening();

        setQuestionIndex(newIndex);
        setQuestion(questions[newIndex]);
      } else {
        handleEndInterview();
      }
    } catch (error) {
      console.error("Failed to submit answer for question", error);
    }
  };

  // Handle the end of the interview
  const handleEndInterview = () => {
    setInterviewFinished(true);
    stopListening();

    window.removeEventListener("beforeunload", handleBeforeUnload);
    document.removeEventListener("visibilitychange", handleVisibilityChange);

    router.push("/feedback");
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 text-gray-800">
      <header className="bg-gradient-to-r from-[#012D65] to-[#0567A0] text-white w-full p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Image src="/Logo.png" alt="AIP Logo" width={60} height={60} />
            <div>
              <h1 className="text-xl font-bold">
                Automated Interview Platform
              </h1>
            </div>
          </div>
        </div>
      </header>
      <main className="flex flex-row justify-center mt-6 w-full max-w-4xl px-4">
        {loading ? (
          <div className="text-center">
            <p>Processing resume, please wait...</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-start bg-blue-100 p-6 rounded-lg shadow-md w-1/3">
              <div className="bg-white p-4 rounded shadow-sm mb-4">
                <h3 className="text-lg font-bold mb-2">
                  Question {questionIndex + 1}:
                </h3>
                <p className="text-sm">{question}</p>
              </div>
              <div className="bg-white p-4 rounded shadow-sm w-full flex-grow overflow-auto">
                <h3 className="text-lg font-semibold mb-2">Your Answer:</h3>
                <ul className="list-disc pl-5">
                  {transcript && <li className="text-sm">{transcript}</li>}
                </ul>
              </div>
            </div>
            <div className="flex flex-col items-center ml-6 w-2/3">
              <Webcam
                audio={false}
                screenshotFormat="image/jpeg"
                width={640}
                height={360}
                className="border border-gray-300 shadow-md rounded-md"
              />
              <div className="mt-4 flex gap-4">
                <Button
                  onClick={startListening}
                  disabled={interviewFinished}
                  className={`${
                    isListening ? "animate-pulse" : ""
                  } bg-blue-600 text-white hover:bg-blue-700`}
                  style={{
                    backgroundColor: isListening ? "red" : "blue",
                  }}
                >
                  {isListening ? "Recording" : "Start Recording"}
                </Button>
                <Button
                  onClick={handleNextQuestion}
                  disabled={interviewFinished}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  style={{
                    display:
                      questionIndex < questions.length - 1 ? "block" : "none",
                    pointerEvents: transcript ? "auto" : "none",
                    opacity: transcript ? "1" : "0.7",
                  }}
                >
                  Next Question
                </Button>
                <Button
                  onClick={handleNextQuestion}
                  disabled={interviewFinished}
                  className="bg-red-600 text-white hover:bg-red-700"
                  style={{
                    display:
                      questionIndex === questions.length - 1 ? "block" : "none",
                    pointerEvents: transcript ? "auto" : "none",
                    opacity: transcript ? "1" : "0.7",
                  }}
                >
                  End Interview
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default InterviewPage;
