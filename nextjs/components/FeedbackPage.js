"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";


function FeedbackPage() {
    const router = useRouter();
    const [feedback, setFeedback] = useState("");
    const [rating, setRating] = useState(0);
    const [loading, setLoading] = useState(true);

    const userData = JSON.parse(sessionStorage.getItem("userData"));
    const authToken = sessionStorage.getItem("authToken");
    const { selectedRole, id } = userData || {};

    // Fetch feedback and rating for the selected role
    useEffect(() => {
        const fetchFeedback = async () => {
            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/user/questions/${selectedRole}/${id}/getFeedback`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${authToken}`,
                        },
                    }
                );

                if (response.ok) {
                    const data = await response.json();


                    if (data.data.feedback) {
                        const parsedFeedback = data.data.feedback
                            .replace(/\\n/g, '\n')
                            .replace(/^- /gm, '\u2022 ');
                        setFeedback(parsedFeedback);
                    } else {
                        setFeedback("Feedback not available.");
                    }

                    setRating(data.data.rating);
                    setLoading(false);
                } else {
                    setTimeout(fetchFeedback, 2000);
                }
            } catch (error) {
                console.error("Failed to fetch feedback:", error);
                setTimeout(fetchFeedback, 2000);
            }
        };

        fetchFeedback();
    }, [selectedRole, id]);

    const handleBackToHome = () => {
        router.push("/");
    };

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
            <main className="flex flex-col items-center mt-6 w-full max-w-4xl px-4">
                {loading ? (
                    <div className="text-center">
                        <p>Fetching feedback, please wait...</p>
                    </div>
                ) : (
                    <div className="bg-white p-6 rounded-lg shadow-md w-full">
                        <h2 className="text-2xl font-bold mb-4">Feedback</h2>
                        <pre className="text-l mb-4 whitespace-pre-wrap" style={{ fontFamily: 'Arial, sans-serif' }}>{feedback}</pre>
                        <div className="flex items-center">
                            <span className="text-lg font-bold mr-2">Rating:</span>
                            <span className="text-2xl font-semibold">{rating} / 5</span>
                        </div>
                        <div className="flex justify-center mt-4">
                            <button
                                onClick={handleBackToHome}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            >
                                Back to Home
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default FeedbackPage;