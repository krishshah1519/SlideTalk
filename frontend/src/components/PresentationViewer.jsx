import React, { useRef, useState } from 'react';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const SlideContent = ({ content }) => (
  <div>
    {content.map((element, i) => {
      // There will only be one image element now, rendered perfectly
      if (element.type === 'image') {
        return <img key={i} src={element.data} alt="slide" className="w-full h-auto rounded-lg" />;
      }
      return null;
    })}
  </div>
);

function PresentationViewer({ presentation, onExport }) {
  const [questions, setQuestions] = useState(Array(presentation?.slides.length || 0).fill(""));
  const [answers, setAnswers] = useState(Array(presentation?.slides.length || 0).fill(""));
  const [loading, setLoading] = useState(false);
  const [pendingSlide, setPendingSlide] = useState(null);

  // Helper to collect context from all slides and scripts
  const getPresentationContext = (uptoIdx) => {
    // Context up to and including the current slide
    return presentation.slides.slice(0, uptoIdx + 1).map((slide, idx) => ({
      slide_number: slide.slide_number,
      content: slide.content,
      script: presentation.scripts[idx]?.script || ""
    }));
  };

  // Send question to backend LLM endpoint for a specific slide
  const handleAskQuestion = async (slideIdx) => {
    setLoading(true);
    let newAnswers = [...answers];
    try {
      const context = getPresentationContext(slideIdx);
      const response = await fetch("http://localhost:8000/presentation/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presentation_id: presentation.presentation_id,
          question: questions[slideIdx],
          context
        })
      });
      const data = await response.json();
      newAnswers[slideIdx] = data.answer || "No answer returned.";
    } catch (err) {
      newAnswers[slideIdx] = "Error: Could not get answer.";
    }
    setAnswers(newAnswers);
    setLoading(false);
  };

  // If no question, prompt to move to next slide
  const handleNoQuestion = (slideIdx) => {
    setPendingSlide(slideIdx);
  };

  const handleMoveNext = (slideIdx) => {
    setPendingSlide(null);
    if (sliderRef.current && slideIdx < presentation.slides.length - 1) {
      sliderRef.current.slickNext();
    }
  };
  // Debug: log audio_files and slides
  console.log('audio_files:', presentation.audio_files);
  console.log('slides:', presentation.slides);
    const sliderRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

  if (!presentation) return null;

  const settings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
    afterChange: current => {
        setCurrentSlide(current);
        document.querySelectorAll('audio').forEach(audio => audio.pause());
        const audio = document.getElementById(`audio-${current}`);
        if (audio) {
            audio.currentTime = 0;
            if (isPlaying) {
                audio.play();
            }
        }
    }
  };


  const handlePlay = () => {
    setIsPlaying(true);
    const audio = document.getElementById(`audio-${currentSlide}`);
    if (audio) {
      audio.currentTime = 0;
      audio.play();
    }
  }

  const handlePause = () => {
    setIsPlaying(false);
    const audio = document.getElementById(`audio-${currentSlide}`);
    if (audio) {
      audio.pause();
    }
  }

  const handleEnded = (index) => {
    const isLastSlide = index === presentation.slides.length - 1;
    if (isPlaying && !isLastSlide) {
      if (sliderRef.current) {
        sliderRef.current.slickNext();
        setTimeout(() => {
          // Only play next audio if still playing
          if (isPlaying) {
            const nextAudio = document.getElementById(`audio-${index + 1}`);
            if (nextAudio) {
              nextAudio.currentTime = 0;
              nextAudio.play();
            }
          }
        }, 500); // Wait for slide transition
      }
    } else {
      setIsPlaying(false); // Stop playing after the last slide
    }
  }

  return (
    <div className="bg-[#2c2c34] max-w-6xl w-full p-8 rounded-xl border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">2. Review & Export</h2>
        <div>
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className={`font-bold py-2 px-5 rounded-lg transition-colors mr-2 ${isPlaying ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-blue-600 hover:bg-blue-500'} text-white`}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button onClick={onExport} className="bg-green-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-green-500 transition-colors">
            Export as Video
          </button>
        </div>
      </div>

      <Slider ref={sliderRef} {...settings}>
        {presentation.slides.map((slide, index) => (
          <div key={slide.slide_number} className="p-4">
            <h3 className="text-center text-lg font-semibold text-gray-400 mb-4">Slide {slide.slide_number}</h3>
            <div className="flex flex-col gap-6 items-center">
              <div className="bg-[#242424] border border-gray-700 p-6 rounded-xl w-full flex justify-center shadow-md">
                <SlideContent content={slide.content} />
              </div>
              <div className="bg-[#242424] p-6 rounded-lg w-full">
                <h4 className="font-bold text-lg border-b border-gray-600 pb-2 mb-2">Generated Script</h4>
                <p className="text-gray-300">{presentation.scripts[index]?.script || "No script available."}</p>
                <audio
                  id={`audio-${index}`}
                  src={`http://localhost:8000/presentation/${presentation.presentation_id}/audio/${presentation.audio_files[index]}`}
                  controls
                  className="w-full mt-4"
                  onEnded={() => handleEnded(index)}
                />
              </div>
            </div>
            {/* Question box for every slide */}
            <div className="bg-[#242424] border border-gray-700 p-6 rounded-xl w-full mt-8 shadow-md flex flex-col items-center">
              <h4 className="font-bold text-lg mb-2 text-white">Ask a question about this slide</h4>
              <textarea
                className="w-full p-3 rounded-lg bg-[#1a1a1a] text-white border border-gray-600 mb-4"
                rows={3}
                placeholder="Type your question here..."
                value={questions[index]}
                onChange={e => {
                  let newQuestions = [...questions];
                  newQuestions[index] = e.target.value;
                  setQuestions(newQuestions);
                }}
                disabled={loading}
              />
              <button
                onClick={() => questions[index] ? handleAskQuestion(index) : handleNoQuestion(index)}
                className="bg-blue-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-500 transition-colors mb-4"
                disabled={loading}
              >
                {loading ? "Processing..." : questions[index] ? "Ask Question" : "Continue"}
              </button>
              {answers[index] && (
                <div className="bg-[#1a1a1a] border border-gray-700 p-4 rounded-lg w-full text-white">
                  <span className="font-bold">Answer:</span>
                  <p className="mt-2 text-gray-300">{answers[index]}</p>
                </div>
              )}
              {/* Prompt for next slide if no question */}
              {pendingSlide === index && (
                <div className="mt-4 w-full flex flex-col items-center">
                  <span className="text-white font-bold mb-2">Shall we move to next slide?</span>
                  <button
                    onClick={() => handleMoveNext(index)}
                    className="bg-green-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-green-500 transition-colors"
                  >
                    Yes, move to next slide
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}

export default PresentationViewer;