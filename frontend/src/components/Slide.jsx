import React from 'react';

const SlideContent = ({ content }) => (
  <div>
    {content.map((element, i) => {
      if (element.type === 'image') {
        return <img key={i} src={element.data} alt="slide" className="w-full h-auto rounded-lg" />;
      }
      return null;
    })}
  </div>
);

function Slide({ slide, script, audioFile, presentationId, index, handleEnded }) {
  return (
    <div>
      <h3 className="text-center text-lg font-semibold text-gray-400 mb-4">Slide {slide.slide_number}</h3>
      <div className="flex flex-col gap-6 items-center">
        <div className="bg-[#242424] border border-gray-700 p-6 rounded-xl w-full flex justify-center shadow-md">
          <SlideContent content={slide.content} />
        </div>
        <div className="bg-[#242424] p-6 rounded-lg w-full">
          <h4 className="font-bold text-lg border-b border-gray-600 pb-2 mb-2">Generated Script</h4>
          <p className="text-gray-300">{script || 'No script available.'}</p>
          <audio
            id={`audio-${index}`}
            src={`http://localhost:8000/presentation/${presentationId}/audio/${audioFile}`}
            controls
            className="w-full mt-4"
            onEnded={() => handleEnded(index)}
          />
        </div>
      </div>
    </div>
  );
}

export default Slide;