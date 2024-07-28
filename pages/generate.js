import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Player = dynamic(() => import('@lottiefiles/react-lottie-player').then(mod => mod.Player), { ssr: false });
const Controls = dynamic(() => import('@lottiefiles/react-lottie-player').then(mod => mod.Controls), { ssr: false });
import thinkingAnimation from '../public/animations/thinking.json';
import successAnimation from '../public/animations/success.json';

const Generate = () => {
  const [model, setModel] = useState('llama3.1');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setResponse('');
    setIsLoading(true);
    setIsDone(false);

    try {
      const response = await fetch('http://127.0.0.1:5001/generate_text_stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        result += chunk;

        const json = JSON.parse(chunk);
        setResponse((prev) => prev + json.response);

        if (json.done) {
          setIsLoading(false);
          setIsDone(true);
        }
      }

    } catch (error) {
      console.error('Error generating text:', error);
      setResponse('Error generating text');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 text-center">Generate Text</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Model:</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prompt:</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring focus:ring-indigo-500"
              required
            />
          </div>
          <button type="submit" className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 rounded text-white font-semibold">
            Generate
          </button>
        </form>
        <div className="mt-6">
          {isLoading && isClient && (
            <div className="flex justify-center">
              <Player
                autoplay
                loop
                src={thinkingAnimation}
                style={{ height: '150px', width: '150px' }}
              >
                <Controls visible={false} />
              </Player>
            </div>
          )}
          {isDone && isClient && (
            <div className="flex justify-center">
              <Player
                autoplay
                src={successAnimation}
                style={{ height: '150px', width: '150px' }}
              >
                <Controls visible={false} />
              </Player>
            </div>
          )}
          <h2 className="text-2xl font-bold mb-2">Response:</h2>
          <pre className="bg-gray-700 p-4 rounded text-gray-300 whitespace-pre-wrap">{response}</pre>
        </div>
      </div>
    </div>
  );
};

export default Generate;
