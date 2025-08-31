import React from 'react';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// You can add these simple overrides to your index.css if needed for the slider arrows/dots
// .slick-prev:before, .slick-next:before { font-size: 24px; }
// .slick-dots li button:before { color: white !important; }

const SlideContent = ({ content }) => (
  <div>
    {content.map((element, i) => {
      switch (element.type) {
        case 'text':
          return <p key={i} className="my-2">{element.data}</p>;
        case 'table':
          return <div key={i} className="my-4" dangerouslySetInnerHTML={{ __html: element.data }} />;
        case 'image':
          return <img key={i} src={element.data} alt="slide visual" className="rounded-lg max-w-full h-auto mx-auto my-4" />;
        default:
          return null;
      }
    })}
  </div>
);

function PresentationViewer({ presentation, onExport }) {
  if (!presentation) return null;

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
    afterChange: current => {
      document.querySelectorAll('audio').forEach(audio => audio.pause());
      const audio = document.getElementById(`audio-${current}`);
      if (audio) {
        audio.currentTime = 0;
        audio.play();
      }
    }
  };

  return (
    <div className="bg-[#2c2c34] p-8 rounded-xl border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">2. Review & Export</h2>
        <button onClick={onExport} className="bg-green-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-green-500 transition-colors">
          Export as Video
        </button>
      </div>

      <Slider {...settings}>
        {presentation.slides.map((slide, index) => (
          <div key={slide.slide_number} className="p-4">
            <h3 className="text-center text-lg font-semibold text-gray-400 mb-4">Slide {slide.slide_number}</h3>
            <div className="grid md:grid-cols-2 gap-6 items-start">
              <div className="bg-[#242424] p-6 rounded-lg min-h-[300px]">
                <SlideContent content={slide.content} />
              </div>
              <div className="bg-[#242424] p-6 rounded-lg">
                <h4 className="font-bold text-lg border-b border-gray-600 pb-2 mb-2">Generated Script</h4>
                <p className="text-gray-300">{presentation.scripts[index]?.script || "No script available."}</p>
                <audio
                  id={`audio-${index}`}
                  src={`http://localhost:8000/${presentation.audio_files[index]}`}
                  controls
                  className="w-full mt-4"
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