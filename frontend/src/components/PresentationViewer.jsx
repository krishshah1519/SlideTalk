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
  const [pendingSlide, setPendingSlide] = useState(null);
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

  const handleAskQuestion = async (slideIdx) => {
    setLoading(true);
    const newAnswers = [...answers];
    try {
      const context = getPresentationContext(slideIdx);
      const response = await fetch('http://localhost:8000/presentation/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentation_id: presentation.presentation_id,
          question: questions[slideIdx],
          context,
        }),
      });
      const data = await response.json();
      newAnswers[slideIdx] = data.answer || 'No answer returned.';
    } catch (err) {
      newAnswers[slideIdx] = 'Error: Could not get answer.';
    }
    setAnswers(newAnswers);
    setLoading(false);
  };

  const handleNoQuestion = (slideIdx) => {
    setPendingSlide(slideIdx);
  };

  const handleMoveNext = (slideIdx) => {
    setPendingSlide(null);
    if (sliderRef.current && slideIdx < presentation.slides.length - 1) {
      sliderRef.current.slickNext();
    }
  };

  const settings = {
    dots: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
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
    const audio = document.getElementById(`audio-${currentSlide}`);
    if (audio) {
      audio.pause();
    }
  };

  const handleEnded = (index) => {
    const isLastSlide = index === presentation.slides.length - 1;
    if (isPlaying && !isLastSlide) {
      if (sliderRef.current) {
        sliderRef.current.slickNext();
        setTimeout(() => {
          if (isPlaying) {
            const nextAudio = document.getElementById(`audio-${index + 1}`);
            if (nextAudio) {
              nextAudio.currentTime = 0;
              nextAudio.play();
            }
          }
        }, 500);
      }
    } else {
      setIsPlaying(false);
    }
  };

  return (
    <div className="bg-[#2c2c34] max-w-6xl w-full p-8 rounded-xl border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">2. Review & Export</h2>
        <div>
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className={`font-bold py-2 px-5 rounded-lg transition-colors mr-2 ${
              isPlaying ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-blue-600 hover:bg-blue-500'
            } text-white`}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={onExport}
            className="bg-green-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-green-500 transition-colors"
          >
            Export as Video
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
              onAskQuestion={() => handleAskQuestion(index)}
              onNoQuestion={() => handleNoQuestion(index)}
              onMoveNext={() => handleMoveNext(index)}
              loading={loading}
              pendingSlide={pendingSlide}
            />
          </div>
        ))}
      </Slider>
    </div>
  );
}

export default PresentationViewer;