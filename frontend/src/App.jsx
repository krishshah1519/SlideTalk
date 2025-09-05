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
        <div className="min-h-screen w-full flex flex-col bg-gh-dark-bg text-gh-dark-text">
            <header className="w-full py-4 px-6 bg-gh-dark-header border-b border-gh-dark-border sticky top-0 z-50">
                <div className="flex justify-between items-center max-w-6xl mx-auto">
                    <div className="flex items-center space-x-3">
                        <svg height="32" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="32" data-view-component="true" className="octicon octicon-mark-github v-align-middle">
                            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.19.01-.82.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21-.15.46-.55.38A8.013 8.013 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                        </svg>
                        <h1 className="text-xl font-semibold">SlideTalk AI</h1>
                    </div>
                </div>
            </header>
            <main className="flex-1 w-full flex items-center justify-center px-4 md:px-8">
                <div className="flex flex-col items-center justify-center w-full max-w-6xl">
                    {!presentation && (
                        <div className="w-full max-w-md mx-auto my-8">
                            <FileUpload onUpload={handleUpload} isLoading={isLoading} progress={uploadProgress} />
                        </div>
                    )}
                    {message && (
                        <p
                            className={`text-center my-6 p-4 rounded-lg font-semibold shadow border ${
                                message.startsWith("❌")
                                    ? "bg-red-900/60 text-red-200 border-red-700"
                                    : "bg-blue-900/60 text-blue-200 border-blue-700"
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
            <footer className="w-full py-4 text-center text-gh-dark-secondary-text text-sm border-t border-gh-dark-border">
                &copy; {new Date().getFullYear()} SlideTalk. All rights reserved.
            </footer>
        </div>
    );
}

export default App;