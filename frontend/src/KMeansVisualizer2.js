import React, { useState } from 'react';
import Plot from 'react-plotly.js';

const KMeansVisualizer2 = () => {
  const [dataPoints, setDataPoints] = useState([]);
  const [centroids, setCentroids] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [numCentroids, setNumCentroids] = useState(3); // 默认质心数量
  const [manualMode, setManualMode] = useState(false);
  const [initMethod, setInitMethod] = useState('Random');
  const [step, setStep] = useState(0);
  const [remainingCentroids, setRemainingCentroids] = useState(numCentroids);

  const generateData = () => {
    const points = Array.from({ length: 100 }, () => ({
      x: Math.random() * 10,
      y: Math.random() * 10,
    }));
    setDataPoints(points);
    setClusters(Array(points.length).fill(-1)); // 初始化聚类
  };

  const initializeCentroids = () => {
    if (initMethod === 'Manual' && !manualMode) {
      setManualMode(true);
      setRemainingCentroids(numCentroids);
      return;
    }

    let initialCentroids = [];
    if (initMethod === 'Random') {
      initialCentroids = randomInitialization();
    } else if (initMethod === 'Farthest First') {
      initialCentroids = farthestFirstInitialization();
    } else if (initMethod === 'KMeans++') {
      initialCentroids = kMeansPlusPlusInitialization();
    }

    setCentroids(initialCentroids);
    setClusters(Array(dataPoints.length).fill(-1)); // 重置聚类
    setStep(0);
  };

  const randomInitialization = () => {
    return dataPoints.sort(() => 0.5 - Math.random()).slice(0, numCentroids);
  };

  const farthestFirstInitialization = () => {
    if (dataPoints.length === 0) return [];

    const selectedCentroids = [dataPoints[Math.floor(Math.random() * dataPoints.length)]];

    while (selectedCentroids.length < numCentroids) {
      const distances = dataPoints.map(point =>
        Math.min(...selectedCentroids.map(centroid =>
          Math.sqrt(Math.pow(point.x - centroid.x, 2) + Math.pow(point.y - centroid.y, 2))
        ))
      );

      const maxDistanceIndex = distances.indexOf(Math.max(...distances));
      selectedCentroids.push(dataPoints[maxDistanceIndex]);
    }

    return selectedCentroids;
  };

  const kMeansPlusPlusInitialization = () => {
    if (dataPoints.length === 0) return [];

    const selectedCentroids = [dataPoints[Math.floor(Math.random() * dataPoints.length)]];

    while (selectedCentroids.length < numCentroids) {
      const distances = dataPoints.map(point =>
        Math.min(...selectedCentroids.map(centroid =>
          Math.sqrt(Math.pow(point.x - centroid.x, 2) + Math.pow(point.y - centroid.y, 2))
        ))
      );

      const totalDistance = distances.reduce((acc, dist) => acc + dist * dist, 0);
      const probabilities = distances.map(dist => (dist * dist) / totalDistance);

      const randomValue = Math.random();
      let cumulativeProbability = 0;

      for (let i = 0; i < probabilities.length; i++) {
        cumulativeProbability += probabilities[i];
        if (cumulativeProbability >= randomValue) {
          selectedCentroids.push(dataPoints[i]);
          break;
        }
      }
    }

    return selectedCentroids;
  };

  const handlePointClick = (event) => {
    if (!manualMode) return;

    const x = event.points[0].x;
    const y = event.points[0].y;

    if (centroids.length < numCentroids) {
      setCentroids([...centroids, { x, y }]);
      setRemainingCentroids(remainingCentroids - 1);
    }

    if (remainingCentroids - 1 === 0) {
      setManualMode(false); // 退出手动模式
    }
  };

  const reset = () => {
    setDataPoints([]);
    setCentroids([]);
    setClusters([]);
    setNumCentroids(3);
    setManualMode(false);
    setStep(0);
    setRemainingCentroids(3);
  };

  const plotData = () => {
    const pointsX = dataPoints.map(point => point.x);
    const pointsY = dataPoints.map(point => point.y);
    const centroidsX = centroids.map(centroid => centroid.x);
    const centroidsY = centroids.map(centroid => centroid.y);

    return [
      {
        x: pointsX,
        y: pointsY,
        mode: 'markers',
        type: 'scatter',
        marker: { color: 'blue' },
        name: 'Data Points',
      },
      {
        x: centroidsX,
        y: centroidsY,
        mode: 'markers',
        type: 'scatter',
        marker: { color: 'red', symbol: 'x', size: 10 },
        name: 'Centroids',
      },
    ];
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <input
        type="number"
        value={numCentroids}
        onChange={(e) => setNumCentroids(Number(e.target.value))}
        min="1"
      />
      <select value={initMethod} onChange={(e) => setInitMethod(e.target.value)}>
        <option value="Random">Random</option>
        <option value="Farthest First">Farthest First</option>
        <option value="KMeans++">KMeans++</option>
        <option value="Manual">Manual</option>
      </select>
      <button onClick={generateData}>Generate Data</button>
      <button onClick={initializeCentroids}>Initialize</button>
      <button onClick={() => {/* Step through KMeans steps */}}>Auto Step</button>
      <button onClick={() => {/* Run to convergence */}}>Run to Convergence</button>
      <button onClick={reset}>Reset</button>
      <br></br>
      <Plot
        data={plotData()}
        layout={{
          width: 600,
          height: 600,
          title: 'KMeans Clustering',
          xaxis: { title: 'X Axis', range: [0, 10] },
          yaxis: { title: 'Y Axis', range: [0, 10] },
          showlegend: true,
        }}
        onClick={handlePointClick}
      />
    </div>
  );
};

export default KMeansVisualizer2;
