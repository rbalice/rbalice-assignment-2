import React, { useState, useEffect, useCallback, useRef } from 'react';
import Plot from 'react-plotly.js';

const INITIAL_METHODS = [
  { value: 'random', label: 'Random' },
  { value: 'farthest', label: 'Farthest First' },
  { value: 'kmeans++', label: 'KMeans++' },
  { value: 'manual', label: 'Manual' },
];

const KMeansVisualizer = () => {
  const [dataPoints, setDataPoints] = useState([]);
  const [centroids, setCentroids] = useState([]);
  const [initMethod, setInitMethod] = useState(INITIAL_METHODS[0].value);
  const [step, setStep] = useState(0);
  const [clusterCount, setClusterCount] = useState(3);
  const [isAutoStepping, setIsAutoStepping] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [clusterAssignments, setClusterAssignments] = useState([]);
  const [isSelectingCentroids, setIsSelectingCentroids] = useState(false);
  const [isRunningToConvergence, setIsRunningToConvergence] = useState(false);
  const convergenceIntervalRef = useRef(null);
  const [userDefinedCentroids, setUserDefinedCentroids] = useState([]);


  const resetAlgorithm = useCallback(() => {
    setCentroids([]);
    setStep(0);
    setIsAutoStepping(false);
    setShowCompletionDialog(false);
    setClusterAssignments([]);
    setUserDefinedCentroids([]);
    setIsRunningToConvergence(false);
    
    if (convergenceIntervalRef.current) {
      clearInterval(convergenceIntervalRef.current);
      convergenceIntervalRef.current = null;
    }
  }, []);

  const generateRandomData = useCallback(() => {
    const points = Array.from({ length: 100 }, () => [
      Math.random() * 20 - 10, 
      Math.random() * 20 - 10,
    ]);
    setDataPoints(points);
    resetAlgorithm();
  }, [resetAlgorithm]);

  const getFarthestCentroids = (points, k) => {
    const centroids = [points[Math.floor(Math.random() * points.length)]];
    while (centroids.length < k) {
      let farthestPoint = null;
      let maxDistance = -Infinity;

      points.forEach(point => {
        const minDistance = centroids.reduce((minDist, centroid) => {
          return Math.min(minDist, calculateDistance(point, centroid));
        }, Infinity);

        if (minDistance > maxDistance) {
          maxDistance = minDistance;
          farthestPoint = point;
        }
      });
      centroids.push(farthestPoint);
    }
    return centroids;
  };
  
  const getKMeansPlusPlusCentroids = (points, k) => {
    const centroids = [points[Math.floor(Math.random() * points.length)]];

    while (centroids.length < k) {
        const distances = points.map(point => {
            return centroids.reduce((minDist, centroid) => {
                return Math.min(minDist, calculateDistance(point, centroid));
            }, Infinity);
        });

        // 在这里初始化 cumulativeDistances
        const cumulativeDistances = [];
        distances.forEach((dist, i) => {
            cumulativeDistances[i] = (cumulativeDistances[i - 1] || 0) + dist ** 2;
        });

        const randomValue = Math.random() * cumulativeDistances[cumulativeDistances.length - 1];
        const newCentroidIndex = cumulativeDistances.findIndex(cumulativeDist => cumulativeDist >= randomValue);
        centroids.push(points[newCentroidIndex]);
    }
    return centroids;
};




  const calculateDistance = (point1, point2) => 
    Math.sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2);

  const assignClusters = (points, centroids) => 
    points.map(point => centroids.reduce((closestIndex, centroid, index) => 
      calculateDistance(point, centroid) < calculateDistance(point, centroids[closestIndex]) 
        ? index 
        : closestIndex, 
      0
    ));

  const centroidsConverged = (oldCentroids, newCentroids) =>
    oldCentroids.every((centroid, i) => 
      calculateDistance(centroid, newCentroids[i]) < 0.01
    );

  const performKMeansStep = useCallback((points, currentCentroids) => {
    const clusters = Array.from({ length: clusterCount }, () => []);
    
    points.forEach(point => {
      const closestCentroidIndex = currentCentroids.reduce((closestIndex, centroid, index) => 
        calculateDistance(point, centroid) < calculateDistance(point, currentCentroids[closestIndex]) 
          ? index 
          : closestIndex, 
        0
      );
      clusters[closestCentroidIndex].push(point);
    });

    return clusters.map(cluster => {
      if (cluster.length === 0) return [Math.random() * 20 - 10, Math.random() * 20 - 10];
      const avgX = cluster.reduce((sum, p) => sum + p[0], 0) / cluster.length;
      const avgY = cluster.reduce((sum, p) => sum + p[1], 0) / cluster.length;
      return [avgX, avgY];
    });
  }, [clusterCount]);

  const initializeCentroids = useCallback(() => {
    let initialCentroids = [];
    if (initMethod === 'random') {
      initialCentroids = dataPoints.slice(0, clusterCount);
    } else if (initMethod === 'farthest') {
      initialCentroids = getFarthestCentroids(dataPoints, clusterCount);
    } else if (initMethod === 'kmeans++') {
      initialCentroids = getKMeansPlusPlusCentroids(dataPoints, clusterCount);
    }
    setCentroids(initialCentroids);
    setStep(1);
  }, [initMethod, dataPoints, clusterCount]);

  const stepThroughKMeans = useCallback(() => {
    if (step === 0) {
      initializeCentroids();
    } else {
      const newCentroids = performKMeansStep(dataPoints, centroids);
      setCentroids(newCentroids);
      setStep(prevStep => prevStep + 1);
      
      const newAssignments = assignClusters(dataPoints, newCentroids);
      setClusterAssignments(newAssignments);
  
      if (centroidsConverged(centroids, newCentroids)) {
        setIsAutoStepping(false);
        setShowCompletionDialog(true);
      }
    }
  }, [step, dataPoints, centroids, initializeCentroids, assignClusters, centroidsConverged, performKMeansStep]);

  const runToConvergence = useCallback(() => {
    setIsAutoStepping(false);
    setIsRunningToConvergence(true);
    
    const runStep = () => {
      if (step === 0) {
        initializeCentroids();
      } else {
        const newCentroids = performKMeansStep(dataPoints, centroids);
        const newAssignments = assignClusters(dataPoints, newCentroids);
        
        if (centroidsConverged(centroids, newCentroids)) {
          setIsRunningToConvergence(false);
          setShowCompletionDialog(true);
          clearInterval(convergenceIntervalRef.current);
          convergenceIntervalRef.current = null;
        } else {
          setCentroids(newCentroids);
          setClusterAssignments(newAssignments);
          setStep(prevStep => prevStep + 1);
        }
      }
    };

    convergenceIntervalRef.current = setInterval(runStep, 100);
  }, [step, dataPoints, centroids, initializeCentroids, performKMeansStep, assignClusters, centroidsConverged]);

  useEffect(() => {
    if (isAutoStepping) {
      const interval = setInterval(() => {
        stepThroughKMeans();
      }, 1000); // 每秒自动步进
  
      return () => clearInterval(interval); // 清除定时器
    }
  }, [isAutoStepping, stepThroughKMeans]);

  useEffect(() => {
    if (initMethod === 'manual' && userDefinedCentroids.length === clusterCount) {
      setIsSelectingCentroids(false);  // 停止质心选择
      setStep(1);  // 解锁下一步
    }
  }, [userDefinedCentroids, initMethod, clusterCount]);
  

  const handleClickAnywhere = (event) => {
    if (initMethod === 'manual' && userDefinedCentroids.length < clusterCount) {
      // 获取点击位置的 X 和 Y 坐标
      const x = event.points ? event.points[0].x : event.event.xaxis.hovertext;
      const y = event.points ? event.points[0].y : event.event.yaxis.hovertext;
  
      // 将点击位置作为质心，防止重复
      if (!userDefinedCentroids.some(centroid => centroid[0] === x && centroid[1] === y)) {
        const selectedPoint = [x, y];
        setUserDefinedCentroids(prev => [...prev, selectedPoint]);
        setCentroids(prev => [...prev, selectedPoint]);
      }
    }
  };
  
  

  return (
    <div className="kmeans-visualizer">
      <h1>KMeans Clustering Visualization</h1>
      <div className="controls">
        <select onChange={(e) => setInitMethod(e.target.value)} value={initMethod}>
          {INITIAL_METHODS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
        <input 
          type="number" 
          value={clusterCount} 
          onChange={(e) => setClusterCount(Math.max(1, parseInt(e.target.value)))}
          min="1"
        />
        <button onClick={generateRandomData}>Generate Data</button>
        <button onClick={initializeCentroids}>Initialize</button>
        <button onClick={() => setIsAutoStepping(true)}>Auto Step</button>
        <button onClick={stepThroughKMeans}>Step</button>
        <button onClick={runToConvergence}>Run to Convergence</button>
        <button onClick={resetAlgorithm}>Reset</button>
      </div>
      {initMethod === 'manual' && (
        <div>
          {userDefinedCentroids.length < clusterCount
            ? `choose ${clusterCount - userDefinedCentroids.length} more centroid `
            : 'enough centroid for next step'}
        </div>
      )}
      <Plot
        data={[
          {
            x: dataPoints.map(p => p[0]),
            y: dataPoints.map(p => p[1]),
            mode: 'markers',
            type: 'scatter',
            marker: { size: 10, color: 'blue', colorscale: 'Viridis' },
            name: 'Data Points',
          },
          {
            x: centroids.map(c => c[0]),
            y: centroids.map(c => c[1]),
            mode: 'markers',
            type: 'scatter',
            marker: { size: 15, color: 'red', symbol: 'x' },
            name: 'Centroids',
          },
        ]}
        layout={{ title: 'KMeans Clustering Visualization', 
          xaxis: { title: 'X axis' }, 
          yaxis: { title: 'Y axis' },
        }}
        onClick={handleClickAnywhere}
      />
      
      {showCompletionDialog && <div className="completion-dialog">Clustering complete!</div>}
    </div>
  );
};

export default KMeansVisualizer;
