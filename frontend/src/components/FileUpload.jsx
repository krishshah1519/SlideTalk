import React, { useState } from 'react';

function FileUpload({ onUpload, isLoading, progress }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('No file chosen');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleUploadClick = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  // Detect dark mode from parent via CSS (Tailwind's dark: class)
  return (
    <div className="p-8 rounded-xl text-center mb-8 border-2 max-w-md w-full bg-blue-50 border-blue-200 dark:bg-gray-800 dark:border-blue-900 transition-colors duration-300">
      <h2 className="text-2xl font-bold mb-2 text-blue-900 dark:text-blue-100">1. Upload Your Presentation</h2>
      <p className="text-blue-700 dark:text-blue-300">Upload a <span className="font-mono">.pptx</span> file to get started.</p>

      <div className="flex justify-center my-6">
        <label htmlFor="file-upload" className="cursor-pointer bg-blue-600 text-white font-semibold py-2 px-6 rounded-l-md hover:bg-blue-500 transition-colors dark:bg-blue-800 dark:hover:bg-blue-700">
          Choose File
        </label>
        <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pptx" />
        <span className="bg-blue-100 py-2 px-4 rounded-r-md text-blue-900 truncate max-w-[250px] dark:bg-gray-900 dark:text-blue-100">
          {fileName}
        </span>
      </div>

      {isLoading && (
        <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2.5 mb-4">
          <div className="bg-blue-600 dark:bg-blue-400 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      <button
        onClick={handleUploadClick}
        disabled={!selectedFile || isLoading}
        className="w-full max-w-xs px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Generating...' : 'Generate Presentation'}
      </button>
    </div>
  );
}

export default FileUpload;