import React, { useState } from "react";
import axios from 'axios';
import logger from "./logger";
import FileUpload from "./components/FileUpload";
import PresentationViewer from "./components/PresentationViewer";

function App() {
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [presentation, setPresentation] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleUpload = async (selectedFile) => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append("file", selectedFile);

        setIsLoading(true);
        setMessage("🔧 Generating your presentation, this may take a moment...");
        setPresentation(null);
        setUploadProgress(0);

        try {
            logger.info(`Uploading file: ${selectedFile.name}`);
            const response = await axios.post("http://localhost:8000/create-presentation/", formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });
            // The response.data is now the JSON object we need
            setPresentation(response.data);
            setMessage("✅ Presentation generated successfully! Review below.");
            logger.info("Presentation generated successfully.");
        } catch (error) {
            const errorMsg = error.response?.data?.detail || "An unexpected error occurred.";
            setMessage(`❌ Error: ${errorMsg}`);
            logger.error("Upload error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async () => {
        if (!presentation || !presentation.presentation_id) return;

        setMessage("🎥 Exporting video... this may take some time.");
        try {
            const response = await axios.get(`http://localhost:8000/presentation/${presentation.presentation_id}/video`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'presentation.mp4');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url); // Clean up the object URL
            setMessage("✅ Video download started successfully.");
        } catch (error) {
            setMessage("❌ Video export failed.");
            logger.error("Export error:", error);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-white p-4">
            <header className="text-center mb-12">
                <h1 className="text-5xl font-extrabold mb-2">SlideTalk AI 🤖</h1>
                <p className="text-lg text-gray-400">
                    Your AI-Powered Presentation Assistant
                </p>
            </header>

            <main className="w-full flex flex-col items-center justify-center px-4 md:px-8">
                {/* Hide FileUpload when presentation is loaded */}
                {!presentation && <FileUpload onUpload={handleUpload} isLoading={isLoading} progress={uploadProgress} />}

                {message && (
                    <p
                        className={`text-center my-6 p-4 rounded-lg font-semibold ${
                            message.startsWith("❌")
                                ? "bg-red-900/50 text-red-300"
                                : "bg-gray-700/50 text-gray-300"
                        }`}
                    >
                        {message}
                    </p>
                )}

                {/* This will now receive the correct 'presentation' object */}
                {presentation && <PresentationViewer
                    presentation={presentation}
                    onExport={handleExport}
                />}
            </main>
        </div>
    );
}

export default App;