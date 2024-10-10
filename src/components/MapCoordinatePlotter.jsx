import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import 'leaflet/dist/leaflet.css';
// Import icons from react-icons
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';

// Dynamically import the Map component with ssr: false
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const MapCoordinatePlotter = () => {
  const [coordinates, setCoordinates] = useState([]);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [zoomToCoordinate, setZoomToCoordinate] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPasteMode, setIsPasteMode] = useState(false);
  const [csvText, setCsvText] = useState('');

  const validateCoordinates = (lat, lon) => {
    const floatLat = parseFloat(lat);
    const floatLon = parseFloat(lon);
    return !isNaN(floatLat) && !isNaN(floatLon) && 
           floatLat >= -90 && floatLat <= 90 && 
           floatLon >= -180 && floatLon <= 180;
  };

  const addCoordinates = () => {
    if (validateCoordinates(lat, lon)) {
      const newCoord = {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        label: label || `${lat}, ${lon}`
      };
      setCoordinates([...coordinates, newCoord]);
      setLat('');
      setLon('');
      setLabel('');
      setError('');
    } else {
      setError('Invalid coordinates. Please check your input.');
    }
  };

  const clearCoordinates = () => {
    setCoordinates([]);
  };

  const parseCSV = (text) => {
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  const handleCsvTextChange = (e) => {
    setCsvText(e.target.value);
  };

  const handlePastedCsv = async () => {
    try {
      const parsedData = await parseCSV(csvText);
      processParsedCsv(parsedData);
    } catch (error) {
      setError('Error parsing CSV: ' + error.message);
    }
  };

  const processParsedCsv = (parsedData) => {
    if (parsedData.length > 0 && 'latitude' in parsedData[0] && 'longitude' in parsedData[0]) {
      const newCoordinates = parsedData
        .filter(row => validateCoordinates(row.latitude, row.longitude))
        .map(row => ({
          latitude: row.latitude,
          longitude: row.longitude,
          label: row.label || `${row.latitude}, ${row.longitude}`
        }));
      
      setCoordinates(prevCoordinates => [...prevCoordinates, ...newCoordinates]);
      setError('');
      
      // Zoom to the first coordinate of the newly added set
      if (newCoordinates.length > 0) {
        setZoomToCoordinate(newCoordinates[0]);
      }
    } else {
      setError('CSV must contain "latitude" and "longitude" columns.');
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result;
        try {
          const parsedData = await parseCSV(content);
          processParsedCsv(parsedData);
        } catch (error) {
          setError('Error parsing CSV file: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  useEffect(() => {
    // This effect runs only on the client-side
    import('leaflet').then(L => {
      delete L.Icon.Default.prototype._getIconUrl;
      
      const customIcon = L.icon({
        iconUrl: '/images/marker.svg',
        iconSize: [25, 41], // size of the icon, adjust as needed
        iconAnchor: [12, 41], // point of the icon which will correspond to marker's location
        popupAnchor: [1, -34], // point from which the popup should open relative to the iconAnchor
      });

      L.Marker.prototype.options.icon = customIcon;
    });
  }, []);

  return (
    <div className={`p-4 min-h-screen flex flex-col`}>
      {!isExpanded && (
        <h1 className="text-2xl font-bold mb-4">Interactive Map Coordinate Plotter</h1>
      )}
      
      <div className={`flex-grow grid ${isExpanded ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} gap-4`}>
        {!isExpanded && (
          <div className="md:col-span-1 overflow-y-auto">
            <h2 className="text-xl font-semibold mb-2">Input Coordinates</h2>
            <Input
              type="text"
              placeholder="Latitude (-90 to 90)"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="mb-2"
            />
            <Input
              type="text"
              placeholder="Longitude (-180 to 180)"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              className="mb-2"
            />
            <Input
              type="text"
              placeholder="Label (optional)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mb-2"
            />
            <Button onClick={addCoordinates} className="mb-2">Add Coordinates</Button>
            <Button onClick={clearCoordinates} variant="outline" className="mb-2">Clear All Coordinates</Button>

            <Tabs defaultValue="drop" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="drop">Upload CSV</TabsTrigger>
                <TabsTrigger value="paste">Paste CSV</TabsTrigger>
              </TabsList>
              <TabsContent value="drop">
                <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer hover:border-gray-400 transition-colors duration-200">
                  <input {...getInputProps()} />
                  {isDragActive ? (
                    <p>Drop the CSV file here...</p>
                  ) : (
                    <p>Drag &apos;n&apos; drop a CSV file here, or click to select a file</p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="paste">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Paste your CSV content here..."
                    value={csvText}
                    onChange={handleCsvTextChange}
                    className="h-32"
                  />
                  <Button onClick={handlePastedCsv}>Process CSV</Button>
                </div>
              </TabsContent>
            </Tabs>
            
            {error && (
              <Alert variant="destructive" className="mt-2">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        <div className={`${isExpanded ? 'col-span-full fixed inset-x-0 z-50' : 'md:col-span-2'} flex flex-col`}>
          <div className={`flex justify-between items-center mb-2 ${isExpanded ? 'px-4' : ''}`}>
            <h2 className="text-xl font-semibold">Interactive Map</h2>
            <Button 
              onClick={toggleExpand} 
              variant="outline" 
              size="sm" 
              className="bg-white shadow-md hover:bg-gray-100"
            >
              {isExpanded ? <MdFullscreenExit size={20} /> : <MdFullscreen size={20} />}
            </Button>
          </div>
          <div className={`flex-grow relative ${isExpanded ? 'w-screen h-[500px]' : 'w-full h-[500px]'}`}>
            <Map 
              coordinates={coordinates} 
              zoomToCoordinate={zoomToCoordinate} 
              isExpanded={isExpanded}
            />
          </div>
        </div>
      </div>
      
      {!isExpanded && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Coordinates Table</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Latitude</TableHead>
                <TableHead>Longitude</TableHead>
                <TableHead>Label</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coordinates.map((coord, index) => (
                <TableRow key={index}>
                  <TableCell>{coord.latitude}</TableCell>
                  <TableCell>{coord.longitude}</TableCell>
                  <TableCell>{coord.label}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default MapCoordinatePlotter;