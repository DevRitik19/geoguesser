import React, { useEffect, useRef, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import { calculateDistance } from '../utils/geometry';

const GlobeMap = ({ countries = [], guesses, targetCountry, gameState, showLabels }) => {
  const globeEl = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef();

  // Track zoom level & center point for LOD Calculations
  const [cameraCenter, setCameraCenter] = useState({ lat: 0, lng: 0, alt: 2.5 });
  const [hoveredLabel, setHoveredLabel] = useState(null);

  // Resize listener
  useEffect(() => {
    const resizeGlobe = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', resizeGlobe);
    resizeGlobe(); // call once initially

    return () => window.removeEventListener('resize', resizeGlobe);
  }, []);

  // Track Camera periodically for LOD calculations
  useEffect(() => {
    let lastState = { lat: 0, lng: 0, alt: 2.5 };
    let frameId;
    let active = true; // flag to stop the loop if the component unmounts

    const trackCamera = () => {
      if (!active) return; // stop loop if unmounted
      if (globeEl.current) {
        const controls = globeEl.current.controls();
        if (controls) {
           const pov = globeEl.current.pointOfView();
           const lt = pov.lat;
           const lg = pov.lng;
           const al = pov.altitude;
           
           // Debounce: update state if alt changed > 0.05 or pan > 3 degrees
           if (
             Math.abs(al - lastState.alt) > 0.05 ||
             Math.abs(lt - lastState.lat) > 3 ||
             Math.abs(lg - lastState.lng) > 3
           ) {
             const newState = { lat: lt, lng: lg, alt: al };
             setCameraCenter(newState);
             lastState = newState;
           }
        }
      }
      frameId = requestAnimationFrame(trackCamera);
    };

    // Delay start slightly to wait for globe initialization
    const timerId = setTimeout(() => { if (active) trackCamera(); }, 500);

    return () => {
      active = false;           // prevent loop from scheduling new frames
      clearTimeout(timerId);    // cancel pending start if unmounted early
      cancelAnimationFrame(frameId); // cancel any in-flight frame
    };
  }, []);

  // Set initial camera position after globe mounts
  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = false;
      globeEl.current.pointOfView({ altitude: 2.5 }, 0);
    }
  }, []);

  // Fly to target country when game ends
  useEffect(() => {
    if ((gameState === 'won' || gameState === 'lost') && targetCountry && globeEl.current) {
      globeEl.current.controls().autoRotate = false;
      globeEl.current.pointOfView({
        lat: targetCountry.lat,
        lng: targetCountry.lng,
        altitude: 1.0 // Closer zoom to see target clearly
      }, 2000); 
    }
  }, [gameState, targetCountry]);


  // Prepare Rings data
  const ringsData = useMemo(() => {
    const data = guesses.map(g => {
      let color = '#EF4444'; 
      if (g.distance < 1000) color = '#10B981'; 
      else if (g.distance < 3000) color = '#F59E0B'; 

      return {
        lat: g.lat,
        lng: g.lng,
        color: color,
        maxR: g.distance < 1000 ? 5 : 3, 
        propagationSpeed: 1,
        repeatPeriod: 1000
      };
    });

    if (gameState !== 'playing' && targetCountry) {
      data.push({
        lat: targetCountry.lat,
        lng: targetCountry.lng,
        color: '#10B981', 
        maxR: 8,
        propagationSpeed: 2,
        repeatPeriod: 800
      });
    }

    return data;
  }, [guesses, targetCountry, gameState]);

  // Handle dynamic labels utilizing LOD Distance calculations
  const labelsData = useMemo(() => {
    let visibleCountries = [];
    const { lat, lng, alt } = cameraCenter;

    // Only process labels if showLabels is true (or game is over and target is shown)
    if (showLabels) {
      // LOD (Level-of-Detail) — threshold raised to 2.5 so labels are visible
      // at the globe's default zoom, not just when extremely close.
      if (alt > 2.5) {
        // Very far out — show nothing to avoid clutter
        visibleCountries = [];
      } else {
        // Pool constraint based on altitude:
        //   alt > 1.5  → only large countries (pop > 50M)
        //   alt > 0.8  → medium countries (pop > 20M)
        //   closer     → all countries
        let pool;
        if (alt > 1.5) {
          pool = countries.filter(c => c.population > 50000000);
        } else if (alt > 0.8) {
          pool = countries.filter(c => c.population > 20000000);
        } else {
          pool = countries;
        }
        
        // Calculate distances from camera center to each country
        const withDistance = pool.map(c => ({
          ...c,
          distToCenter: calculateDistance(lat, lng, c.lat, c.lng)
        }));

        // Sort nearest first
        withDistance.sort((a, b) => a.distToCenter - b.distToCenter);

        // Cap label count to avoid visual clutter
        const limit = alt > 1.5 ? 8 : alt > 0.8 ? 12 : 15;
        visibleCountries = withDistance.slice(0, limit);
      }
    }

    // Process specific target if game over
    let finalLabels = visibleCountries.map(c => ({
      ...c,
      isTarget: false
    }));

    if (gameState !== 'playing' && targetCountry) {
      // Ensure target is highlighted and always visible
      const existing = finalLabels.find(c => c.id === targetCountry.id);
      if (existing) {
        existing.isTarget = true;
      } else {
        // dummy distance so it scales normally if hovered
        finalLabels.push({ ...targetCountry, distToCenter: 0, isTarget: true });
      }
    }

    return finalLabels;
  }, [countries, cameraCenter, targetCountry, gameState, showLabels]);

  return (
     <div ref={containerRef} className="w-full h-full min-h-[300px] sm:min-h-[380px] lg:min-h-0 rounded-2xl overflow-hidden glassmorphism flex items-center justify-center border border-white/10 shadow-2xl relative z-10">
       {dimensions.width > 0 && (
         <Globe
           ref={globeEl}
           width={dimensions.width}
           height={dimensions.height}
           globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
           backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
           
           ringsData={ringsData}
           ringColor="color"
           ringMaxRadius="maxR"
           ringPropagationSpeed="propagationSpeed"
           ringRepeatPeriod="repeatPeriod"
           ringResolution={64}

           // Labels Configuration
           labelsData={labelsData}
           labelLat={d => d.lat}
           labelLng={d => d.lng}
           labelText={d => d.name}
           labelSize={d => {
             if (d.isTarget) return 2.0;
             if (d === hoveredLabel) return 1.8;
             // Scale dynamically by distance: closest 1.3, furthest visible ~0.9
             const scale = Math.max(0.9, 1.3 - (d.distToCenter / 20000));
             return scale;
           }}
           labelDotRadius={d => (d.isTarget || d === hoveredLabel ? 0.3 : 0.1)}
           labelColor={d => {
             if (d.isTarget) return '#10B981'; // Green for target
             if (d === hoveredLabel) return '#0ea5e9'; // Neon blue for hover
             return 'rgba(255, 255, 255, 0.7)'; // Standard light gray
           }}
           labelResolution={2}
           labelAltitude={0.01}
           labelsTransitionDuration={1000}

           // Interactive Hover Tooltip & Select
           onLabelHover={setHoveredLabel}
           labelLabel={d => `
             <div style="background: rgba(15, 23, 42, 0.9); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); color: white; display: flex; flex-direction: column; gap: 4px; font-family: 'Outfit', sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.5); backdrop-filter: blur(10px);">
                <div style="font-weight: 700; font-size: 15px; letter-spacing: 0.5px;">${d.name}</div>
                <div style="font-size: 13px; color: #94a3b8; display: flex; justify-content: space-between; gap: 12px;">
                  <span>Population:</span> 
                  <span style="font-weight: 600; color: #f8fafc;">${d.population.toLocaleString()}</span>
                </div>
             </div>
           `}
         />
       )}
    </div>
  );
};

export default GlobeMap;
