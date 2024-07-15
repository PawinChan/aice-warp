route = null

function permutations(arr) {
  const results = [];
  function permute(arr, chosen = []) {
    if (arr.length === 0) {
      results.push(chosen.slice()); // Create a copy of the chosen elements
      return;
    }

    for (let i = 0; i < arr.length; i++) {
      const nextItem = arr.splice(i, 1)[0]; // Remove and return the element at index i
      chosen.push(nextItem);
      permute(arr.slice(), chosen); // Recursive call with remaining elements and updated chosen list
      arr.splice(i, 0, nextItem); // Restore the removed element back to its original position
      chosen.pop();
    }
  }

  permute(arr.slice()); // Create a copy to avoid modifying the original array
  return results;
}


function validateRoute(route) {
  const pickedUp = [];
  for (const stop of route) {
    switch (stop.type) {
      case 'pickup':
        pickedUp.push(stop.user);
        break;
      case 'dropoff':
        if (!pickedUp.includes(stop.user)) {
          return false;
        }
        break;
    }
  }
  return true;
}

function poiToLonLat(pois) {
  return pois.map(poi => [poi.lng, poi.lat]);
}

function lonLatToCoords(lonLat) {
  return lonLat.map(coord => [coord[1], coord[0]]); // Swap lat/lng for JS convention
}

function getDistance(data) {
  try {
    let result = data.features[0].properties.summary.duration
    // console.log(`Distance: ${result}`)
    return result //data.features[0].properties.summary.duration;
  } catch (error) {
    console.error(error); // Log the error for debugging
    return 800000; // Maximum approximated distance
  }
}

async function fetchRoute(points) {
  const args = {
    coordinates: points,
    instructions: false,
    suppress_warnings: true,
    extra_info: [],
  };
  const headers = {"Content-Type": "application/json"};
  // const response = await session.post(`https://${OPENROUTE_URL}/v2/directions/driving-car/geojson`, JSON.stringify(args));
  const response = await fetch(
    `https://${OPENROUTE_URL}/v2/directions/driving-car/geojson`,
    { method: 'POST', headers: headers, body: JSON.stringify(args), cache: "force-cache"},
  );
  const result = await response.json()
  return result
}

async function findMostEfficientRoute(poiData) {
  if (poiData.length > 8) {
    alert("Too many points to calculate a route. Maximum 4 people/8 points.")
    return
  }
  const validPermutations = permutations(poiData).filter(pm => validateRoute(pm));
  console.log(`Valid permutations: ${validPermutations.length}`);

  const tasks = validPermutations.map(pm => fetchRoute(poiToLonLat(pm)));
  const calculatedRoutes = await Promise.all(tasks); // Use Promise.all for parallel execution

  console.log(calculatedRoutes);

  const shortestRoute = calculatedRoutes.reduce((shortest, current) => {
    const currentDistance = getDistance(current);
    return !shortest || currentDistance < getDistance(shortest) ? current : shortest;
  }, null);
  console.log(`Found shortest route, distance = ${getDistance(shortestRoute)}`);
  console.log(shortestRoute)

  return shortestRoute;
}


async function plotMostEfficientRoute() {
  if (poiData.length < 2) {
    console.warn("Not enough points to calculate a route.");
    return
  }
  if (poiData.length > 8) {
    alert("Too many points to calculate a route. Maximum 4 people/8 points.")
    return 
  }
  let bestRoute = await findMostEfficientRoute(poiData)
  let coords = lonLatToCoords(bestRoute.features[0].geometry.coordinates);
  if (route) {
    route.remove();
  }
  route = L.polyline(coords, { color: 'dodgerBlue' }).addTo(mainMap);  

}