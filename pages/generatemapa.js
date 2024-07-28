import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/images/marker-icon-2x.png',
  iconUrl: '/images/marker-icon.png',
  shadowUrl: '/images/marker-shadow.png'
});

const Player = dynamic(() => import('@lottiefiles/react-lottie-player').then(mod => mod.Player), { ssr: false });
const Controls = dynamic(() => import('@lottiefiles/react-lottie-player').then(mod => mod.Controls), { ssr: false });
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

import 'leaflet/dist/leaflet.css';
import thinkingAnimation from '../public/animations/thinking.json';
import successAnimation from '../public/animations/success.json';



const GenerateMapa = () => {
  const [model, setModel] = useState('llama3.1');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [lugaresResponse, setLugaresResponse] = useState('');
  const [lugaresTuristicos, setLugaresTuristicos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setResponse('');
    setLugaresResponse('');
    setLugaresTuristicos([]);
    setIsLoading(true);
    setIsDone(false);

    const formattedPrompt = `Devuelve un JSON con los lugares turísticos de ${prompt} en el siguiente formato obligatorio: { "nombre_del_lugar_1": "latitud°hemisferio latitud / longitud°hemisferio longitud","nombre_del_lugar_2": "latitud°hemisferio latitud" / longitud°hemisferio longitud"}`;

    try {
      const response = await fetch('http://127.0.0.1:5001/generate_places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: formattedPrompt,
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
        setLugaresResponse((prev) => prev + json.response);

        if (json.done) {
          setIsLoading(false);
          setIsDone(true);

          // Parse the response to JSON and set the places
          try {
            console.log('json.response', lugaresResponse);
            const lugares = JSON.parse(lugaresResponse);
            console.log('lugares', lugares);
            const parsedLugares = Object.entries(lugares).map(([lugar, coordenada]) => {
              const coords = coordenada.match(/-?\d+\.\d+/g).map(Number);
              return { lugar, coordenadas: coords };
            });
            setLugaresTuristicos(parsedLugares);
          } catch (e) {
            setResponse('Failed to parse JSON response');
          }
        }
      }
    } catch (error) {
      console.error('Error generating places:', error);
      setResponse('Error generating places');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 text-center">Generate Text and Map</h1>
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
          {isClient && lugaresTuristicos.length > 0 && (
            <div className="mt-6">
              <MapContainer center={[parseFloat(lugaresTuristicos[0].coordenadas[0]), parseFloat(lugaresTuristicos[0].coordenadas[1])]} zoom={10} style={{ height: '400px', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {lugaresTuristicos.map((lugar, index) => (
                  <Marker key={index} position={[parseFloat(lugar.coordenadas[0]), parseFloat(lugar.coordenadas[1])]}>
                    <Popup>
                      <strong>{lugar.lugar}</strong><br />
                      Coordenadas: {lugar.coordenadas[0]}, {lugar.coordenadas[1]}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateMapa;
