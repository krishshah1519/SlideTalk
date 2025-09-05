import React, { useState, useRef, useEffect } from 'react';

function QnA({
  index,
  question,
  answer,
  onQuestionChange,
  onAskQuestion,
  onNoQuestion,
  loading,
  isListening,
}) {
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const transcriptReceived = useRef(false);
  const inputRef = useRef(null); // Ref for the input box

  // Effect to focus the input when listening starts
  useEffect(() => {
    if (isListening) {
      inputRef.current?.focus();
    }
  }, [isListening]);

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    if (recognitionRef.current) {
        recognitionRef.current.stop();
    }
    
    transcriptReceived.current = false;
    setIsRecording(true);
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    
    recognition.onstart = () => {
        silenceTimerRef.current = setTimeout(() => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        }, 5000); // 5 seconds of silence
    };

    recognition.onresult = (event) => {
        clearTimeout(silenceTimerRef.current);
        transcriptReceived.current = true;
        let interim = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interim += event.results[i][0].transcript;
            }
        }
        
        const currentQuestion = finalTranscript || interim;
        const fakeEvent = { target: { value: currentQuestion } };
        onQuestionChange(fakeEvent);

        if (finalTranscript) {
            setIsRecording(false);
            recognition.stop();
        }
    };

    recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
            alert('Speech recognition error: ' + event.error);
        }
        clearTimeout(silenceTimerRef.current);
        setIsRecording(false);
    };

    recognition.onend = () => {
        clearTimeout(silenceTimerRef.current);
        if (!transcriptReceived.current) {
            onNoQuestion();
        }
        setIsRecording(false);
        recognitionRef.current = null;
    };
    
    recognition.start();
  };

  useEffect(() => {
      if(isListening && !isRecording){
          handleVoiceInput();
      }
  }, [isListening]);

  const handleVoiceOutput = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis not supported in this browser.');
      return;
    }
    const utter = new window.SpeechSynthesisUtterance(answer);
    utter.lang = 'en-US';
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="bg-[#242424] border border-gray-700 p-6 rounded-xl w-full mt-8 shadow-md flex flex-col items-center">
      <h4 className="font-bold text-lg mb-2 text-white">Ask a question about this slide</h4>
      <div className="relative w-full mb-4">
        <input
          ref={inputRef}
          type="text"
          className="w-full p-3 pr-24 rounded-lg bg-[#1a1a1a] text-white border border-gray-600"
          placeholder="Type or speak your question..."
          value={question}
          onChange={onQuestionChange}
          disabled={loading || isRecording}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
          <button
            type="button"
            onClick={handleVoiceInput}
            className={`bg-transparent text-purple-400 hover:text-purple-600 p-2 rounded-full focus:outline-none ${isRecording ? 'animate-pulse' : ''}`}
            disabled={loading || isRecording}
            title="Record"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v2m0 0h-3m3 0h3m-3-2a6 6 0 006-6V9a6 6 0 10-12 0v3a6 6 0 006 6z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onAskQuestion}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-500 transition-colors"
            disabled={loading || !question}
            title="Send"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l16 8-16 8V4z" />
            </svg>
          </button>
        </div>
      </div>
      {(isRecording) && (
        <div className="w-full mb-2 text-purple-300 text-left text-sm">🎤 <span className="font-semibold">Listening...</span> {liveTranscript}</div>
      )}
       {!isRecording && isListening && (
        <div className="w-full mb-2 text-blue-300 text-left text-sm">Ready for your question. Press the mic or start speaking.</div>
      )}
      <button
        onClick={onNoQuestion}
        className="bg-gray-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-gray-500 transition-colors mb-4 w-full"
        disabled={loading}
      >
        Continue Without Question
      </button>
      {answer && (
        <div className="bg-[#1a1a1a] border border-gray-700 p-4 rounded-lg w-full text-white flex flex-col gap-2">
          <span className="font-bold">Answer:</span>
          <p className="mt-2 text-gray-300">{answer}</p>
          <button
            type="button"
            onClick={handleVoiceOutput}
            className="bg-pink-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-pink-500 transition-colors self-start"
          >
            🔊 Listen
          </button>
        </div>
      )}
    </div>
  );
}

export default QnA;