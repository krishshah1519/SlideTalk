import React from 'react';

function QnA({
  index,
  question,
  answer,
  onQuestionChange,
  onAskQuestion,
  onNoQuestion,
  onMoveNext,
  loading,
  pendingSlide,
}) {
  return (
    <div className="bg-[#242424] border border-gray-700 p-6 rounded-xl w-full mt-8 shadow-md flex flex-col items-center">
      <h4 className="font-bold text-lg mb-2 text-white">Ask a question about this slide</h4>
      <textarea
        className="w-full p-3 rounded-lg bg-[#1a1a1a] text-white border border-gray-600 mb-4"
        rows={3}
        placeholder="Type your question here..."
        value={question}
        onChange={onQuestionChange}
        disabled={loading}
      />
      <button
        onClick={question ? onAskQuestion : onNoQuestion}
        className="bg-blue-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-500 transition-colors mb-4"
        disabled={loading}
      >
        {loading ? 'Processing...' : question ? 'Ask Question' : 'Continue'}
      </button>
      {answer && (
        <div className="bg-[#1a1a1a] border border-gray-700 p-4 rounded-lg w-full text-white">
          <span className="font-bold">Answer:</span>
          <p className="mt-2 text-gray-300">{answer}</p>
        </div>
      )}
      {pendingSlide === index && (
        <div className="mt-4 w-full flex flex-col items-center">
          <span className="text-white font-bold mb-2">Shall we move to next slide?</span>
          <button
            onClick={onMoveNext}
            className="bg-green-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-green-500 transition-colors"
          >
            Yes, move to next slide
          </button>
        </div>
      )}
    </div>
  );
}

export default QnA;