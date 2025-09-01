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

  return (
    <div className="bg-[#2c2c34] p-8 rounded-xl text-center mb-8 border border-gray-700 max-w-md w-full">
      <h2 className="text-2xl font-bold mb-2">1. Upload Your Presentation</h2>
      <p className="text-gray-400">Upload a `.pptx` file to get started.</p>

      <div className="flex justify-center my-6">
        <label htmlFor="file-upload" className="cursor-pointer bg-indigo-600 text-white font-semibold py-2 px-6 rounded-l-md hover:bg-indigo-500 transition-colors">
          Choose File
        </label>
        <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pptx" />
        <span className="bg-[#1a1a1a] py-2 px-4 rounded-r-md text-gray-300 truncate max-w-[250px]">
          {fileName}
        </span>
      </div>

      {isLoading && (
        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
          <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
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