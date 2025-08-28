import React, {useState} from "react";
import axios from 'axios';

function App() {
    const [message, setMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange= (e) => {
        setSelectedFile(e.target.files[0]);
        }

    const handleUpload = async ()=> {
        if(!selectedFile){
            setMessage("Please select a file first.");
           return;
      }
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post("http://localhost:8000/create-presentation/", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(response.data.message);
    } catch (error) {
      setMessage("File upload failed.");
      console.error("Upload error:", error);
    }
  };
  return (
    <div style={{ padding: '20px' }}>
      <h1>PPT Presentation bot</h1>
      <hr style={{ margin: '20px 0' }} />
      <h2>Upload Your Presentation</h2>
      <input type="file" onChange={handleFileChange} accept=".pptx" />
      <button onClick={handleUpload}>Generate Presentation</button>
      {message && <p><strong>Status:</strong> {message}</p>}
    </div>
  );
}

export default App;