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
    <div className="p-8 rounded-lg text-center border border-gh-dark-border max-w-md w-full bg-gh-dark-header">
      <h2 className="text-2xl font-bold mb-2 text-gh-dark-text">1. Upload Your Presentation</h2>
      <p className="text-gh-dark-secondary-text">Upload a <span className="font-mono">.pptx</span> file to get started.</p>

      <div className="flex justify-center my-6">
        <label htmlFor="file-upload" className="cursor-pointer bg-gh-green text-white font-semibold py-2 px-6 rounded-l-md hover:bg-green-700 transition-colors">
          Choose File
        </label>
        <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pptx" />
        <span className="bg-gh-dark-bg py-2 px-4 rounded-r-md text-gh-dark-text truncate max-w-[250px] border border-gh-dark-border">
          {fileName}
        </span>
      </div>

      {isLoading && (
        <div className="w-full bg-gh-dark-border rounded-full h-2.5 mb-4">
          <div className="bg-gh-blue h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      <button
        onClick={handleUploadClick}
        disabled={!selectedFile || isLoading}
        className="w-full max-w-xs px-6 py-3 bg-gh-blue text-white font-bold rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Generating...' : 'Generate Presentation'}
      </button>
    </div>
  );
}

export default FileUpload;