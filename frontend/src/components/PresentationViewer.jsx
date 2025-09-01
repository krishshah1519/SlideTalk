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
    const sliderRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

  if (!presentation) return null;

  const settings = {
    dots: true,
    infinite: false, // Set to false to prevent looping during autoplay
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
    afterChange: current => {
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
      const audio = document.getElementById(`audio-0`);
      if (audio) {
          audio.play();
      }
  }

  const handleEnded = (index) => {
    const isLastSlide = index === presentation.slides.length - 1;
    if (isPlaying && !isLastSlide) {
        if (sliderRef.current) {
            sliderRef.current.slickNext();
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
        <button onClick={handlePlay} disabled={isPlaying} className="bg-blue-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-500 transition-colors mr-2 disabled:bg-gray-500">
          {isPlaying ? 'Playing...' : 'Play'}
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
              <div className="bg-[#1a1a1a] p-1 rounded-lg w-full flex justify-center">
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
          </div>
        ))}
      </Slider>
    </div>
  );
}

export default PresentationViewer;