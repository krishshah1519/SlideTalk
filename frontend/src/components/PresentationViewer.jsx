import React, { useRef, useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Slide from './Slide';
import QnA from './QnA';

function PresentationViewer({ presentation, onExport }) {
  const [questions, setQuestions] = useState(Array(presentation?.slides.length || 0).fill(''));
  const [answers, setAnswers] = useState(Array(presentation?.slides.length || 0).fill(''));
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const sliderRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!presentation) return null;

  const getPresentationContext = (uptoIdx) => {
    return presentation.slides.slice(0, uptoIdx + 1).map((slide, idx) => ({
      slide_number: slide.slide_number,
      content: slide.content,
      script: presentation.scripts[idx]?.script || '',
    }));
  };

  const handleAskQuestion = async (slideIdx, question) => {
    setIsListening(false); 
    setIsPlaying(false);
    setLoading(true);
    const newAnswers = [...answers];
    try {
      const context = getPresentationContext(slideIdx);
      const response = await fetch('http://localhost:8000/presentation/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentation_id: presentation.presentation_id,
          question: question,
          context,
        }),
      });
      const data = await response.json();
      newAnswers[slideIdx] = data.answer || 'No answer returned.';
      if (data.action === 'next_slide') {
        setTimeout(() => handleMoveNext(slideIdx), 2000); // Wait 2s before moving
      }
    } catch (err) {
      newAnswers[slideIdx] = 'Error: Could not get answer.';
    }
    setAnswers(newAnswers);
    setLoading(false);
  };

  const handleMoveNext = (slideIdx) => {
    if (sliderRef.current && slideIdx < presentation.slides.length - 1) {
      sliderRef.current.slickNext();
    }
  };

  const handleNoQuestion = (slideIdx) => {
    handleAskQuestion(slideIdx, "");
  };

  const settings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
    beforeChange: () => {
        setIsListening(false);
    },
    afterChange: (current) => {
      setCurrentSlide(current);
      document.querySelectorAll('audio').forEach((audio) => audio.pause());
      const audio = document.getElementById(`audio-${current}`);
      if (audio) {
        audio.currentTime = 0;
        if (isPlaying) {
          audio.play();
        }
      }
    },
  };

  const handlePlay = () => {
    setIsPlaying(true);
    const audio = document.getElementById(`audio-${currentSlide}`);
    if (audio) {
      audio.currentTime = 0;
      audio.play();
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    setIsListening(false);
    document.querySelectorAll('audio').forEach((audio) => audio.pause());
  };

  const handleEnded = (index) => {
    const isLastSlide = index === presentation.slides.length - 1;
    if (isPlaying && !isLastSlide) {
      setIsListening(true);
    } else {
      setIsPlaying(false);
    }
  };

  return (
    <div className="bg-gh-dark-header max-w-6xl w-full p-8 rounded-lg border border-gh-dark-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gh-dark-text">2. Review </h2>
        <div>
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className={`font-bold py-2 px-5 rounded-lg transition-colors mr-2 ${
              isPlaying ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-gh-blue hover:bg-blue-700'
            } text-white`}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>

      <Slider ref={sliderRef} {...settings}>
        {presentation.slides.map((slide, index) => (
          <div key={slide.slide_number} className="p-4">
            <Slide
              slide={slide}
              script={presentation.scripts[index]?.script}
              audioFile={presentation.audio_files[index]}
              presentationId={presentation.presentation_id}
              index={index}
              handleEnded={handleEnded}
            />
            <QnA
              index={index}
              question={questions[index]}
              answer={answers[index]}
              onQuestionChange={(e) => {
                const newQuestions = [...questions];
                newQuestions[index] = e.target.value;
                setQuestions(newQuestions);
              }}
              onAskQuestion={() => handleAskQuestion(index, questions[index])}
              onNoQuestion={() => handleNoQuestion(index)}
              loading={loading}
              isListening={isListening && currentSlide === index}
            />
          </div>
        ))}
      </Slider>
    </div>
  );
}

export default PresentationViewer;