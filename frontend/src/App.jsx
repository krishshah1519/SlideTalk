
export default App;
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
    const [darkMode, setDarkMode] = useState(true);

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
        <div className={
            `min-h-screen w-full flex flex-col transition-colors duration-300 ` +
            (darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900')
        }>
            <header className={`w-full py-6 shadow-lg text-center mb-0 sticky top-0 z-50 ${darkMode ? 'bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-800' : 'bg-gradient-to-r from-blue-100 via-indigo-100 to-blue-50'}`}>
                <div className="flex justify-between items-center max-w-3xl mx-auto">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight">SlideTalk AI 🤖</h1>
                        <p className={`text-base ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>Your AI-Powered Presentation Assistant</p>
                    </div>
                    <button
                        className={`rounded-full px-4 py-2 font-semibold shadow ${darkMode ? 'bg-blue-800 text-blue-100 hover:bg-blue-700' : 'bg-blue-200 text-blue-900 hover:bg-blue-300'}`}
                        onClick={() => setDarkMode(!darkMode)}
                        aria-label="Toggle dark mode"
                    >
                        {darkMode ? '🌙 Dark' : '☀️ Light'}
                    </button>
                </div>
            </header>
            <main className="flex-1 w-full flex items-center justify-center px-4 md:px-8">
                <div className="flex flex-col items-center justify-center w-full max-w-6xl">
                    {!presentation && (
                        <div className={`w-full max-w-md mx-auto my-8 p-8 rounded-xl shadow-lg border-2 transition-colors duration-300 ${darkMode ? 'bg-gray-800 border-blue-900' : 'bg-blue-50 border-blue-200'}`}>
                            <FileUpload onUpload={handleUpload} isLoading={isLoading} progress={uploadProgress} />
                        </div>
                    )}
                    {message && (
                        <p
                            className={`text-center my-6 p-4 rounded-lg font-semibold shadow border ${
                                message.startsWith("❌")
                                    ? (darkMode ? "bg-red-900/60 text-red-200 border-red-700" : "bg-red-100 text-red-700 border-red-300")
                                    : (darkMode ? "bg-blue-900/60 text-blue-200 border-blue-700" : "bg-blue-50 text-blue-900 border-blue-200")
                            }`}
                        >
                            {message}
                        </p>
                    )}
                    {presentation && <PresentationViewer
                        presentation={presentation}
                        onExport={handleExport}
                    />}
                </div>
            </main>
            <footer className={`w-full py-4 text-center shadow mt-0 sticky bottom-0 z-50 ${darkMode ? 'bg-gray-950 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
                &copy; {new Date().getFullYear()} SlideTalk. All rights reserved.
            </footer>
        </div>
    );
}


