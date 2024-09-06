"use client";

import React, { useEffect, useState } from "react";
import useSpeechToText from "react-hook-speech-to-text";
import Webcam from "react-webcam";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";

function InterviewPage() {
    const router = useRouter();
    const {
        error,
        interimResult,
        isRecording,
        results,
        startSpeechToText,
        stopSpeechToText,
    } = useSpeechToText({
        continuous: true,
        useLegacyResults: false,
    });

    const [question, setQuestion] = useState("");
    const [questionIndex, setQuestionIndex] = useState(0);
    const [questions, setQuestions] = useState([]);
    const [interviewFinished, setInterviewFinished] = useState(false);
    const [loading, setLoading] = useState(true);

    const userData = JSON.parse(sessionStorage.getItem("userData"));
    const authToken = sessionStorage.getItem("authToken");
    const { selectedRole, id } = userData || {};

    useEffect(() => {
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

                if (!response.ok) {
                    throw new Error("Failed to fetch questions");
                }

                const data = await response.json();
                setQuestions(data.data.questions.map((e) => e.question));
                console.log(questions);
                setQuestion(data.data.questions[0].question);
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch questions:", error);
            }
        };

        const intervalId = setInterval(fetchQuestions, 10000);
        return () => clearInterval(intervalId);
    }, [selectedRole, id]);

    useEffect(() => {
        document.addEventListener("contextmenu", (e) => e.preventDefault());
        window.addEventListener("beforeunload", (e) => {
            e.preventDefault();
            e.returnValue = "";
        });
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("contextmenu", (e) =>
                e.preventDefault(),
            );
            window.removeEventListener("beforeunload", (e) => {
                e.preventDefault();
                e.returnValue = "";
            });
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
        };
    }, []);

    const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
            alert(
                "You are leaving the interview page. Please stay on this page to continue the interview.",
            );
        }
    };

    const handleNextQuestion = async () => {
        const currentAnswer = results
            .map((result) => result.transcript)
            .join(" ");
        const newIndex = questionIndex + 1;

        try {
            // Send the current answer to the API
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/user/${selectedRole}/${id}/${questionIndex}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({ answer: currentAnswer }),
                },
            );

            // If there are more questions, load the next question
            if (newIndex < questions.length) {
                setQuestionIndex(newIndex);
                setQuestion(questions[newIndex]);

                // Clear the results for the new question
                stopSpeechToText();
                startSpeechToText();
            } else {
                // If it's the last question, end the interview
                handleEndInterview();
            }
        } catch (error) {
            console.error(
                "Failed to submit the answer or fetch the next question:",
                error,
            );
        }
    };

    const handleEndInterview = () => {
        setInterviewFinished(true);
        stopSpeechToText();
        router.push("/feedback");
    };

    useEffect(() => {
        if (interviewFinished) {
            console.log("Interview finished. Results:", results);
        }
    }, [interviewFinished, results]);

    if (error)
        return <p>Web Speech API is not available in this browser 🤷‍</p>;

    return (
        <div className="flex flex-col items-center min-h-screen bg-gray-100 text-gray-800">
            <header className="bg-gradient-to-r from-[#012D65] to-[#0567A0] text-white w-full p-4 shadow-md">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Image
                            src="/Logo 1.png"
                            alt="Indian Emblem"
                            className="hidden md:block"
                            width={40}
                            height={40}
                        />
                        <Image
                            src="/Logo.png"
                            alt="DRDO Logo"
                            width={60}
                            height={60}
                        />
                        <div>
                            <h1 className="text-xl font-bold">
                                Defence Research & Development Organisation
                            </h1>
                            <p className="text-sm">
                                Ministry of Defence, Government of India
                            </p>
                        </div>
                    </div>
                </div>
            </header>
            <main className="flex flex-row justify-center mt-6 w-full max-w-4xl px-4">
                {loading ? (
                    <div className="text-center">
                        <p>Processing questions, please wait...</p>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col items-start bg-blue-100 p-6 rounded-lg shadow-md w-1/3">
                            <div className="bg-white p-4 rounded shadow-sm mb-4">
                                <h2 className="text-lg font-semibold">
                                    {question}
                                </h2>
                            </div>
                            <div className="bg-white p-4 rounded shadow-sm w-full flex-grow overflow-auto">
                                <h3 className="text-lg font-semibold mb-2">
                                    Your Answers:
                                </h3>
                                <ul className="list-disc pl-5">
                                    {results.map((result) => (
                                        <li
                                            key={result.timestamp}
                                            className="mb-1"
                                        >
                                            {result.transcript}
                                        </li>
                                    ))}
                                    {interimResult && (
                                        <li className="italic">
                                            {interimResult}
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                        <div className="flex flex-col items-center ml-6 w-2/3">
                            <Webcam
                                audio={false}
                                screenshotFormat="image/jpeg"
                                width={620}
                                height={400}
                                className="border border-gray-300 shadow-md rounded-md"
                            />
                            <div className="mt-4 flex gap-4">
                                <Button
                                    onClick={
                                        isRecording
                                            ? stopSpeechToText
                                            : startSpeechToText
                                    }
                                    disabled={interviewFinished}
                                    className="bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    {isRecording
                                        ? "Stop Recording"
                                        : "Start Recording"}
                                </Button>
                                <Button
                                    onClick={handleNextQuestion}
                                    disabled={interviewFinished}
                                    className="bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    Next
                                </Button>
                                <Button
                                    onClick={handleEndInterview}
                                    disabled={interviewFinished}
                                    className="bg-red-600 text-white hover:bg-red-700"
                                >
                                    End
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
